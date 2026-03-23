from __future__ import annotations

import difflib
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class BlipContext:
    active_panel: Optional[str] = None
    active_media_type: Optional[str] = None
    current_item_name: Optional[str] = None
    last_intent: Optional[str] = None
    last_entity: Optional[str] = None
    last_result: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ParsedCommand:
    raw_text: str
    normalized_text: str
    intent: str
    target: Optional[str] = None
    action: Optional[str] = None
    params: Dict[str, Any] = field(default_factory=dict)
    confidence: float = 0.0
    needs_clarification: bool = False
    clarification_question: Optional[str] = None


@dataclass
class ConversationTurn:
    command: ParsedCommand
    context: BlipContext


class BlipParser:
    """
    Natural-language parser for Blip.

    Strategy:
    1. Normalize messy transcripts.
    2. Apply explicit command parsers.
    3. Use context-aware shortcuts for short follow-ups.
    4. Fall back to fuzzy intent/target matching.
    5. Prefer clarification over guessing when intent is weak.
    """

    FILLER_WORDS = {
        "please", "could", "can", "would", "just", "um", "uh", "like",
        "hey", "ok", "okay", "now", "the", "a", "an",
    }

    NUMBER_WORDS = {
        "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
        "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
        "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
        "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18,
        "nineteen": 19, "twenty": 20, "thirty": 30, "forty": 40,
        "fifty": 50, "sixty": 60,
    }

    CANONICAL_TARGETS = {
        "youtube": ["youtube", "video", "videos", "music", "player", "yt"],
        "camera": ["camera", "cam"],
        "media": ["media", "gallery", "photo", "photos", "image", "images", "recording", "recordings"],
        "gmail": ["gmail", "email", "mail", "inbox"],
        "telegram": ["telegram", "message", "messages"],
        "cart": ["cart", "basket"],
        "notes": ["notes", "note"],
        "hub": ["hub", "memory"],
        "settings": ["settings", "preferences"],
        "games": ["games", "game"],
        "chat": ["chat"],
        "map": ["map", "maps", "directions", "route"],
        "weather": ["weather", "forecast"],
        "calendar": ["calendar", "agenda", "schedule"],
        "chart": ["chart", "graph"],
        "timer": ["timer", "countdown"],
        "alarm": ["alarm"],
        "reminder": ["reminder", "remind"],
        "system": ["blip", "assistant", "system"],
    }

    OPENABLE_PANELS = {
        "settings", "chat", "games", "calendar", "gmail", "telegram",
        "media", "cart", "notes", "hub", "map", "chart", "camera", "youtube",
    }

    def __init__(self) -> None:
        self.intent_patterns = self._build_patterns()

    def _build_patterns(self) -> Dict[str, Any]:
        return {}

    def parse(self, text: str, ctx: Optional[BlipContext] = None) -> ParsedCommand:
        ctx = ctx or BlipContext()
        normalized = self._normalize_text(text)

        strong = (
            self._parse_wake_sleep(normalized, ctx)
            or self._parse_scroll(normalized, ctx)
            or self._parse_close(normalized, ctx)
            or self._parse_resize(normalized, ctx)
            or self._parse_time_date_weather(normalized, ctx)
            or self._parse_timers_alarms_reminders(normalized, ctx)
            or self._parse_notes_memory_hub(normalized, ctx)
            or self._parse_cart(normalized, ctx)
            or self._parse_camera(normalized, ctx)
            or self._parse_open_close_panels(normalized, ctx)
            or self._parse_media_gallery(normalized, ctx)
            or self._parse_maps(normalized, ctx)
            or self._parse_youtube(normalized, ctx)
            or self._parse_volume(normalized, ctx)
            or self._parse_gmail(normalized, ctx)
            or self._parse_telegram(normalized, ctx)
            or self._parse_image_generation(normalized, ctx)
            or self._parse_save_commands(normalized, ctx)
            or self._parse_contextual_shortcuts(normalized, ctx)
        )

        if strong:
            strong.raw_text = text
            strong.normalized_text = normalized
            return strong

        fuzzy = self._fuzzy_fallback(normalized, ctx)
        fuzzy.raw_text = text
        fuzzy.normalized_text = normalized
        return fuzzy

    def _normalize_text(self, text: str) -> str:
        t = text.lower().strip()
        replacements = {
            "what's": "what is",
            "whats": "what is",
            "wake up": "wake",
            "go back to sleep": "sleep",
            "turn off": "stop",
            "shut ": "close ",
            "e mail": "email",
            "gee mail": "gmail",
            "you tube": "youtube",
            "tele gram": "telegram",
            "un mute": "unmute",
            "lo fi": "lofi",
        }
        for src, dest in replacements.items():
            t = t.replace(src, dest)

        t = re.sub(r"[^\w\s:@.-]", " ", t)
        t = re.sub(r"\s+", " ", t).strip()

        words = t.split()
        converted: List[str] = []
        for w in words:
            converted.append(str(self.NUMBER_WORDS[w]) if w in self.NUMBER_WORDS else w)
        return " ".join(converted)

    def _confidence(self, base: float, bonus: float = 0.0) -> float:
        return round(min(0.99, base + bonus), 2)

    def _make(
        self,
        normalized_text: str,
        intent: str,
        target: Optional[str] = None,
        action: Optional[str] = None,
        params: Optional[Dict[str, Any]] = None,
        confidence: float = 0.75,
        needs_clarification: bool = False,
        clarification_question: Optional[str] = None,
    ) -> ParsedCommand:
        return ParsedCommand(
            raw_text="",
            normalized_text=normalized_text,
            intent=intent,
            target=target,
            action=action,
            params=params or {},
            confidence=confidence,
            needs_clarification=needs_clarification,
            clarification_question=clarification_question,
        )

    def _contains_any(self, text: str, phrases: List[str]) -> bool:
        return any(p in text for p in phrases)

    def _extract_email(self, text: str) -> Optional[str]:
        match = re.search(r"[\w\.-]+@[\w\.-]+\.\w+", text)
        return match.group(0) if match else None

    def _extract_duration(self, text: str) -> Optional[Dict[str, Any]]:
        match = re.search(r"(\d+)\s*(second|seconds|minute|minutes|hour|hours)", text)
        if not match:
            return None
        return {"value": int(match.group(1)), "unit": match.group(2)}

    def _extract_time_expression(self, text: str) -> Optional[str]:
        patterns = [
            r"\b\d{1,2}:\d{2}\b(?:\s*(am|pm))?",
            r"\b\d{1,2}\s*(am|pm)\b",
            r"\btomorrow\b",
            r"\btonight\b",
            r"\bthis morning\b",
            r"\bthis evening\b",
            r"\bat \d{1,2}(?::\d{2})?\s*(am|pm)?\b",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(0)
        return None

    def _extract_location(self, text: str) -> Optional[str]:
        patterns = [
            r"weather in ([\w\s]+)$",
            r"check weather in ([\w\s]+)$",
            r"forecast for ([\w\s]+)$",
            r"map of ([\w\s]+)$",
            r"map for ([\w\s]+)$",
            r"coffee shops in ([\w\s]+)$",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()
        return None

    def _extract_route(self, text: str) -> Optional[Dict[str, str]]:
        patterns = [
            r"route from ([\w\s]+) to ([\w\s]+)",
            r"directions from ([\w\s]+) to ([\w\s]+)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return {"from": match.group(1).strip(), "to": match.group(2).strip()}
        return None

    def _extract_quoted_or_tail_text(self, text: str, trigger_words: List[str]) -> Optional[str]:
        for tw in trigger_words:
            if tw in text:
                tail = text.split(tw, 1)[1].strip()
                return tail if tail else None
        return None

    def _resolve_target_by_context(self, ctx: BlipContext, preferred: Optional[str] = None) -> str:
        if preferred:
            return preferred
        if ctx.active_panel:
            return ctx.active_panel
        return "global"

    def _closest_target(self, token: str) -> Optional[str]:
        candidates = []
        for canonical, aliases in self.CANONICAL_TARGETS.items():
            candidates.extend((canonical, alias) for alias in aliases)
        names = [alias for _, alias in candidates]
        best = difflib.get_close_matches(token, names, n=1, cutoff=0.78)
        if not best:
            return None
        alias = best[0]
        for canonical, candidate in candidates:
            if candidate == alias:
                return canonical
        return None

    def _clarify(self, text: str, question: str, target: str = "global", intent: str = "unknown") -> ParsedCommand:
        return self._make(
            text,
            intent=intent,
            target=target,
            action="clarify",
            confidence=0.4,
            needs_clarification=True,
            clarification_question=question,
        )

    def _extract_index(self, text: str) -> Optional[int]:
        match = re.search(r"\b(\d{1,3})\b", text)
        return int(match.group(1)) if match else None

    def _extract_youtube_query(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:play|open|show|watch)\s+(?:video\s+)?(?:about|of|for|on)\s+(.+)$",
            r"(?:play|open|show|watch)\s+(.+?)\s+on\s+youtube$",
            r"(?:youtube)\s+(.+)$",
            r"(?:music)\s+(.+)$",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if not match:
                continue
            value = match.group(1).strip()
            if value and value not in {"video", "music", "youtube"}:
                return value
        return None

    def _extract_send_message_tail(self, text: str) -> Optional[str]:
        for trigger in ["saying", "message", "that says", "with"]:
            if trigger in text:
                tail = text.split(trigger, 1)[1].strip()
                if tail:
                    return tail
        return None

    def _parse_wake_sleep(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        if self._contains_any(text, ["close everything and sleep", "close everything and go to sleep", "close all and sleep"]):
            return self._make(text, "system.close_and_sleep", target="system", action="close_and_sleep", confidence=0.97)

        if re.fullmatch(r"(hey\s+)?blip", text) or self._contains_any(text, ["wake blip", "wake", "wake up blip"]):
            return self._make(text, "system.wake", target="system", action="wake", confidence=0.96)

        if self._contains_any(text, ["go to sleep", "sleep", "sleep blip"]):
            return self._make(text, "system.sleep", target="system", action="sleep", confidence=0.95)
        return None

    def _parse_scroll(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        if "scroll down" in text:
            return self._make(text, "ui.scroll", target=self._resolve_target_by_context(ctx), action="down", confidence=0.94)
        if "scroll up" in text:
            return self._make(text, "ui.scroll", target=self._resolve_target_by_context(ctx), action="up", confidence=0.94)
        if "stop scrolling" in text or "stop scroll" in text:
            return self._make(text, "ui.scroll", target=self._resolve_target_by_context(ctx), action="stop", confidence=0.94)
        return None

    def _parse_close(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        if self._contains_any(text, ["close everything", "close all", "shut everything"]):
            return self._make(text, "ui.close_all", target="system", action="close_all", confidence=0.96)

        if self._contains_any(text, ["close alert", "stop the alarm", "stop alarm"]):
            return self._make(text, "alarm.stop", target="alarm", action="stop", confidence=0.95)
        if self._contains_any(text, ["stop the timer", "stop timer"]):
            return self._make(text, "timer.stop", target="timer", action="stop", confidence=0.95)
        return None

    def _parse_resize(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        if self._contains_any(text, ["reset size", "normal size", "default size"]):
            return self._make(text, "ui.resize", target="blip", action="reset", confidence=0.95)
        if self._contains_any(text, ["make you smaller", "make blip smaller", "make blip mini", "shrink blip"]):
            return self._make(text, "ui.resize", target="blip", action="smaller", confidence=0.93)
        if self._contains_any(text, ["make you bigger", "make blip bigger", "grow blip", "bigger blip"]):
            return self._make(text, "ui.resize", target="blip", action="bigger", confidence=0.93)
        return None

    def _parse_time_date_weather(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        if self._contains_any(text, ["what time is it", "current time", "time now", "tell me the time"]):
            return self._make(text, "time.get", target="time", action="get", confidence=0.96)

        if self._contains_any(text, ["what day is today", "what is today s date", "what date is today"]):
            return self._make(text, "date.get", target="date", action="get", confidence=0.96)

        if self._contains_any(text, ["weather showcase", "weather animations", "weather animation"]):
            action = "stop" if any(word in text for word in ["stop", "close", "end", "cancel"]) else "start"
            return self._make(text, "weather.showcase", target="weather", action=action, confidence=0.9)

        if self._contains_any(text, ["weather", "forecast"]):
            location = self._extract_location(text)
            return self._make(
                text,
                "weather.get",
                target="weather",
                action="get",
                params={"location": location} if location else {},
                confidence=0.94 if location else 0.88,
            )
        return None

    def _parse_timers_alarms_reminders(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        duration = self._extract_duration(text)
        when = self._extract_time_expression(text)

        if any(word in text for word in ["timer", "countdown"]):
            if duration:
                return self._make(
                    text,
                    "timer.create",
                    target="timer",
                    action="create",
                    params=duration,
                    confidence=0.95,
                )
            if any(word in text for word in ["set", "start", "create"]):
                return self._clarify(text, "How long should I set the timer for?", target="timer", intent="timer.create")

        if any(word in text for word in ["alarm", "wake me", "remind me", "reminder"]):
            intent = "alarm.create" if ("alarm" in text or "wake me" in text) else "reminder.create"
            target = "alarm" if ("alarm" in text or "wake me" in text) else "reminder"
            if when:
                return self._make(
                    text,
                    intent,
                    target=target,
                    action="create",
                    params={"when": when},
                    confidence=0.93,
                )
            return self._clarify(text, "What time should I set it for?", target=target, intent=intent)

        if self._contains_any(text, ["cancel all alarms", "delete all reminders", "clear all timers"]):
            return self._make(text, "timers.clear_all", target="timer", action="clear_all", confidence=0.96)

        if self._contains_any(text, ["cancel timer", "stop timer", "delete reminder", "cancel reminder", "cancel next timer"]):
            return self._make(text, "timer.cancel", target="timer", action="cancel", confidence=0.9)

        return None

    def _parse_notes_memory_hub(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        if self._contains_any(text, ["take note", "note that", "write this down", "save note"]):
            note = self._extract_quoted_or_tail_text(text, ["note that", "write this down", "take note", "save note"])
            if note:
                return self._make(text, "notes.save", target="notes", action="save", params={"text": note}, confidence=0.93)
            return self._make(text, "notes.open", target="notes", action="open", confidence=0.9)

        if self._contains_any(text, ["open notes", "show notes", "read notes", "review notes"]):
            return self._make(text, "notes.open", target="notes", action="open", confidence=0.92)

        if self._contains_any(text, ["clear notes", "delete last note", "remove last note"]):
            action = "clear" if "clear" in text else "delete_last"
            return self._make(text, "notes.manage", target="notes", action=action, confidence=0.92)

        if self._contains_any(text, ["what do you remember about me", "show memory", "open memory", "show my profile"]):
            return self._make(text, "memory.review", target="memory", action="review", confidence=0.94)

        if self._contains_any(text, ["open hub", "show hub", "what is in the hub", "what s in the hub"]):
            if "what is in the hub" in text or "what s in the hub" in text:
                return self._make(text, "hub.review", target="hub", action="review", confidence=0.93)
            return self._make(text, "hub.open", target="hub", action="open", confidence=0.92)

        if self._contains_any(text, ["save this to hub", "add to hub", "store in hub"]):
            return self._make(text, "hub.save_current", target="hub", action="save_current", confidence=0.91)
        return None

    def _parse_cart(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        if self._contains_any(text, ["open cart", "show cart"]):
            return self._make(text, "cart.open", target="cart", action="open", confidence=0.94)
        if self._contains_any(text, ["close cart", "hide cart"]):
            return self._make(text, "cart.close", target="cart", action="close", confidence=0.94)
        if self._contains_any(text, ["clear cart", "empty cart"]):
            return self._make(text, "cart.clear", target="cart", action="clear", confidence=0.95)
        if self._contains_any(text, ["what is in the cart", "what s in the cart", "review cart"]):
            return self._make(text, "cart.review", target="cart", action="review", confidence=0.93)
        if self._contains_any(text, ["next item", "next product"]):
            return self._make(text, "cart.navigate", target="cart", action="next", confidence=0.88)
        if self._contains_any(text, ["previous item", "previous product", "back item"]):
            return self._make(text, "cart.navigate", target="cart", action="previous", confidence=0.88)
        return None

    def _parse_camera(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        if self._contains_any(text, ["open camera", "start camera"]):
            return self._make(text, "camera.open", target="camera", action="open", confidence=0.95)
        if self._contains_any(text, ["close camera", "stop camera"]):
            return self._make(text, "camera.close", target="camera", action="close", confidence=0.95)
        if self._contains_any(text, ["snap photo", "take picture", "take photo", "capture image"]):
            return self._make(text, "camera.photo", target="camera", action="photo", confidence=0.96)
        if self._contains_any(text, ["record video", "start recording"]):
            return self._make(text, "camera.record_start", target="camera", action="record_start", confidence=0.95)
        if self._contains_any(text, ["stop recording", "finish recording"]):
            return self._make(text, "camera.record_stop", target="camera", action="record_stop", confidence=0.95)
        return None

    def _parse_open_close_panels(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        open_match = re.search(r"\b(open|show|view|launch)\s+(settings|chat|games|calendar|gmail|telegram|media|gallery|cart|notes|hub|map|chart|camera|youtube)\b", text)
        if open_match:
            raw_target = open_match.group(2)
            target = "media" if raw_target == "gallery" else raw_target
            return self._make(text, f"{target}.open", target=target, action="open", confidence=0.92)

        close_match = re.search(r"\b(close|hide|dismiss|exit)\s+(settings|chat|games|calendar|gmail|telegram|media|gallery|cart|notes|hub|map|chart|camera|youtube|video)\b", text)
        if close_match:
            raw_target = close_match.group(2)
            target = "youtube" if raw_target == "video" else ("media" if raw_target == "gallery" else raw_target)
            return self._make(text, f"{target}.close", target=target, action="close", confidence=0.92)
        return None

    def _parse_media_gallery(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        if self._contains_any(text, ["open media", "show my photos", "open gallery", "open recordings"]):
            action = "open_recordings" if "recording" in text else "open"
            return self._make(text, "media.open", target="media", action=action, confidence=0.92)

        if self._contains_any(text, ["open latest photo", "show latest photo", "open latest video", "show latest video"]):
            media_type = "video" if "video" in text else "image"
            return self._make(text, "media.open_latest", target="media", action="open_latest", params={"media_type": media_type}, confidence=0.93)

        if re.search(r"\b(open|show|delete|remove)\s+(photo|image|picture|video)?\s*(\d{1,3})\b", text):
            match = re.search(r"\b(open|show|delete|remove)\s+(photo|image|picture|video)?\s*(\d{1,3})\b", text)
            if match:
                verb = match.group(1)
                index = int(match.group(3))
                action = "open_index" if verb in {"open", "show"} else "delete_index"
                return self._make(text, "media.item", target="media", action=action, params={"index": index}, confidence=0.94)

        if self._contains_any(text, ["delete latest photo", "delete current image", "remove current image"]):
            action = "delete_current" if "current" in text else "delete_latest"
            return self._make(text, "media.delete", target="media", action=action, confidence=0.92)

        if self._contains_any(text, ["rotate photo", "rotate image", "rotate left", "brighten", "darken", "undo edits", "reset photo"]):
            if "rotate left" in text:
                return self._make(text, "media.edit", target="media", action="rotate_left", confidence=0.9)
            if "rotate" in text:
                return self._make(text, "media.edit", target="media", action="rotate_right", confidence=0.9)
            if "brighten" in text:
                return self._make(text, "media.edit", target="media", action="brighten", confidence=0.88)
            if "darken" in text:
                return self._make(text, "media.edit", target="media", action="darken", confidence=0.88)
            if "undo" in text:
                return self._make(text, "media.edit", target="media", action="undo", confidence=0.89)
            return self._make(text, "media.edit", target="media", action="reset", confidence=0.89)

        if self._contains_any(text, ["share this photo", "download this photo", "set this photo as wallpaper"]):
            if "download" in text:
                return self._make(text, "media.share", target="media", action="download_current", confidence=0.9)
            if "wallpaper" in text:
                return self._make(text, "media.share", target="media", action="wallpaper_current", confidence=0.9)
            return self._make(text, "media.share", target="media", action="share_current", confidence=0.9)
        return None

    def _parse_maps(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        route = self._extract_route(text)
        if route:
            return self._make(text, "map.route", target="map", action="route", params=route, confidence=0.95)

        if self._contains_any(text, ["map", "maps", "directions", "route", "coffee shops in"]):
            location = self._extract_location(text)
            if location:
                return self._make(text, "map.search", target="map", action="search", params={"location": location}, confidence=0.92)
        return None

    def _parse_youtube(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        control_patterns = {
            "pause": r"^(?:pause|pause the video|pause the player)$",
            "play": r"^(?:play|resume|play the video|resume the video)$",
            "stop": r"^(?:stop|stop the video|stop the player)$",
            "unmute": r"^(?:unmute|sound on|audio on|turn on sound)$",
            "mute": r"^(?:mute|sound off|turn off sound)$",
            "next": r"^(?:next|next video|another video|different video)$",
            "restart": r"^(?:restart|start over|from the beginning)$",
            "rewind": r"^(?:rewind|go back|replay)$",
            "forward": r"^(?:forward|skip ahead|fast forward|go forward)$",
        }
        if any(re.fullmatch(pattern, text) for pattern in control_patterns.values()) and (
            ctx.active_panel == "youtube" or "youtube" in text or "video" in text or ctx.active_media_type in {"video", "music"}
        ):
            for action, pattern in control_patterns.items():
                if re.fullmatch(pattern, text):
                    return self._make(text, f"youtube.{action}", target="youtube", action=action, confidence=0.92)

        if self._contains_any(text, ["open music", "show music"]):
            return self._make(text, "youtube.library", target="youtube", action="open_music", confidence=0.91)
        if self._contains_any(text, ["open videos", "show videos"]):
            return self._make(text, "youtube.library", target="youtube", action="open_videos", confidence=0.91)

        if self._contains_any(text, ["make the video big", "fullscreen", "full screen", "cinema mode"]):
            return self._make(text, "youtube.layout", target="youtube", action="video_big", confidence=0.9)
        if self._contains_any(text, ["make the video smaller", "normal view", "default view"]):
            return self._make(text, "youtube.layout", target="youtube", action="video_small", confidence=0.9)

        if self._contains_any(text, ["play", "open", "show", "watch", "youtube", "video", "music"]):
            query = self._extract_youtube_query(text)
            if query:
                return self._make(text, "youtube.open", target="youtube", action="open", params={"query": query}, confidence=0.9)
            if text in {"youtube", "open youtube", "show youtube"}:
                return self._make(text, "youtube.open", target="youtube", action="open", confidence=0.86)
        return None

    def _parse_volume(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        if self._contains_any(text, ["volume down", "turn it down", "lower it", "quieter"]):
            target = "youtube" if ctx.active_panel == "youtube" else "speech"
            return self._make(text, "volume.adjust", target=target, action="down", confidence=0.89)
        if self._contains_any(text, ["volume up", "turn it up", "raise it", "louder"]):
            target = "youtube" if ctx.active_panel == "youtube" else "speech"
            return self._make(text, "volume.adjust", target=target, action="up", confidence=0.89)
        return None

    def _parse_gmail(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        if self._contains_any(text, ["connect gmail", "sign in to gmail", "login to gmail", "link gmail"]):
            return self._make(text, "gmail.auth", target="gmail", action="connect", confidence=0.95)
        if self._contains_any(text, ["disconnect gmail", "sign out of gmail", "unlink gmail"]):
            return self._make(text, "gmail.auth", target="gmail", action="disconnect", confidence=0.95)

        if self._contains_any(text, ["open gmail", "open inbox", "show gmail", "check email", "open sent mail"]):
            action = "open_sent" if "sent" in text else "open_inbox"
            return self._make(text, "gmail.open", target="gmail", action=action, confidence=0.93)
        if self._contains_any(text, ["close gmail", "hide gmail"]):
            return self._make(text, "gmail.close", target="gmail", action="close", confidence=0.93)
        if self._contains_any(text, ["refresh inbox", "reload inbox", "refresh gmail"]):
            return self._make(text, "gmail.refresh", target="gmail", action="refresh", confidence=0.92)

        read_match = re.search(r"\b(read|open|show)\s+(email|message)\s+(\d{1,2})\b", text)
        if read_match:
            return self._make(text, "gmail.read", target="gmail", action="read_index", params={"index": int(read_match.group(3))}, confidence=0.94)

        email = self._extract_email(text)
        if self._contains_any(text, ["compose email", "write email", "send email"]):
            if email:
                subject = ""
                text_body = self._extract_send_message_tail(text) or ""
                subject_match = re.search(r"\bsubject\s+(.+?)(?:\s+(?:message|saying|that says|with)\s+|$)", text)
                if subject_match:
                    subject = subject_match.group(1).strip()
                return self._make(
                    text,
                    "gmail.compose",
                    target="gmail",
                    action="compose",
                    params={"to": email, "subject": subject, "text": text_body},
                    confidence=0.94,
                )
            if "send email" in text or "compose email" in text or "write email" in text:
                return self._clarify(text, "Who should I send the email to?", target="gmail", intent="gmail.compose")

        if self._contains_any(text, ["send photo in email", "send photo in gmail", "send this in email"]):
            params: Dict[str, Any] = {"share_type": "photo"}
            if email:
                params["to"] = email
            return self._make(text, "gmail.share_current", target="gmail", action="share_current", params=params, confidence=0.92)

        if self._contains_any(text, ["send this note in email", "email this note"]):
            return self._make(text, "gmail.share_current", target="gmail", action="share_current", params={"share_type": "note"}, confidence=0.91)

        if self._contains_any(text, ["save this as a draft", "open draft in email", "open draft in gmail"]):
            return self._make(text, "gmail.draft", target="gmail", action="open_draft", confidence=0.9)
        return None

    def _parse_telegram(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        if "email" in text or "gmail" in text or "mail" in text:
            return None

        if self._contains_any(text, ["open telegram", "show telegram"]):
            return self._make(text, "telegram.open", target="telegram", action="open", confidence=0.94)
        if self._contains_any(text, ["close telegram", "hide telegram"]):
            return self._make(text, "telegram.close", target="telegram", action="close", confidence=0.94)
        if self._contains_any(text, ["send telegram test", "run telegram test"]):
            return self._make(text, "telegram.test", target="telegram", action="send_test", confidence=0.94)

        if self._contains_any(text, ["send this photo on telegram", "send this photo to telegram", "telegram this photo"]):
            tail = None
            match = re.search(r"\b(?:to|for)\s+(.+)$", text)
            if match:
                tail = match.group(1).strip()
            return self._make(text, "telegram.share_photo", target="telegram", action="share_photo", params={"chat_id": tail or ""}, confidence=0.92)

        if self._contains_any(text, ["send telegram", "compose telegram", "telegram message", "send message in telegram"]):
            tail = self._extract_send_message_tail(text) or ""
            target_match = re.search(r"\b(?:to|for)\s+(.+?)(?:\s+(?:saying|message|with)\s+|$)", text)
            target = target_match.group(1).strip() if target_match else ""
            if tail or target:
                return self._make(text, "telegram.compose", target="telegram", action="compose", params={"chat_id": target, "text": tail}, confidence=0.91)
            return self._clarify(text, "Who should I send the Telegram message to?", target="telegram", intent="telegram.compose")
        return None

    def _parse_image_generation(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        if self._contains_any(text, ["create an image of", "make an image of", "draw", "illustrate", "generate image"]):
            prompt = self._extract_quoted_or_tail_text(
                text,
                ["create an image of", "make an image of", "draw", "illustrate", "generate image"],
            )
            if prompt:
                return self._make(text, "image.generate", target="image", action="generate", params={"prompt": prompt}, confidence=0.9)

        if self._contains_any(text, ["show me a picture of", "show me a photo of", "what does"]):
            query = self._extract_quoted_or_tail_text(text, ["show me a picture of", "show me a photo of", "what does"])
            if query:
                return self._make(text, "image.lookup", target="image", action="lookup", params={"query": query}, confidence=0.88)
        return None

    def _parse_save_commands(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        if self._contains_any(text, ["save this to media", "save photo", "save this photo"]):
            return self._make(text, "save.media", target="media", action="save_photo", confidence=0.9)
        if self._contains_any(text, ["save to creations", "save this graph", "save this chart", "save this design"]):
            return self._make(text, "save.creation", target="creation", action="save_creation", confidence=0.9)
        if self._contains_any(text, ["save this map", "save this location"]):
            return self._make(text, "save.map", target="map", action="save_map", confidence=0.9)
        if self._contains_any(text, ["save this video", "save this song", "save to favorites", "save to playlist"]):
            return self._make(text, "youtube.save", target="youtube", action="save_video", confidence=0.9)
        if self._contains_any(text, ["save this to hub", "save this in hub"]):
            return self._make(text, "hub.save_current", target="hub", action="save_current", confidence=0.9)
        return None

    def _parse_contextual_shortcuts(self, text: str, ctx: BlipContext) -> Optional[ParsedCommand]:
        if text in {"send", "send it"}:
            if ctx.active_panel == "gmail":
                return self._make(text, "gmail.send", target="gmail", action="send", confidence=0.84)
            if ctx.active_panel == "telegram":
                return self._make(text, "telegram.send", target="telegram", action="send", confidence=0.84)
            return self._clarify(text, "Do you want to send an email, a Telegram message, or a photo?")

        if text in {"pause", "play", "unmute", "mute", "next", "restart", "rewind", "forward"} and ctx.active_panel == "youtube":
            action = "play" if text == "resume" else text
            return self._make(text, f"youtube.{action}", target="youtube", action=action, confidence=0.9)

        if text in {"close", "hide it", "dismiss it"} and ctx.active_panel:
            return self._make(text, "panel.close", target=ctx.active_panel, action="close", confidence=0.84)

        if text in {"open it", "show it"}:
            if ctx.current_item_name:
                return self._make(text, "context.open_current", target=self._resolve_target_by_context(ctx), action="open_current", params={"item": ctx.current_item_name}, confidence=0.78)
            return self._clarify(text, "What should I open?")

        if text in {"delete it", "remove it"}:
            if ctx.current_item_name:
                return self._make(text, "context.delete_current", target=self._resolve_target_by_context(ctx), action="delete_current", params={"item": ctx.current_item_name}, confidence=0.78)
            return self._clarify(text, "What should I delete?")
        return None

    def _fuzzy_fallback(self, text: str, ctx: BlipContext) -> ParsedCommand:
        tokens = text.split()
        fuzzy_targets = [self._closest_target(token) for token in tokens]
        fuzzy_targets = [target for target in fuzzy_targets if target]

        if fuzzy_targets:
            target = fuzzy_targets[0]
            if any(word in text for word in ["open", "show", "view"]):
                return self._make(text, f"{target}.open", target=target, action="open", confidence=0.62)
            if any(word in text for word in ["close", "hide", "dismiss"]):
                return self._make(text, f"{target}.close", target=target, action="close", confidence=0.62)
            if target in {"gmail", "telegram"} and "send" in text:
                return self._clarify(text, f"What should I send in {target}?", target=target, intent=f"{target}.compose")
            return self._clarify(text, f"Do you want me to open, close, send, or search in {target}?", target=target)

        if any(word in text for word in ["open", "close", "send", "save", "show", "play"]):
            return self._clarify(text, "Do you want me to open, send, search, save, or close something?")

        return self._make(
            text,
            intent="unknown",
            target="global",
            action="clarify",
            confidence=0.35,
            needs_clarification=True,
            clarification_question="Do you want me to open, send, search, or save something?",
        )


class BlipConversationEngine:
    """
    Thin stateful layer on top of BlipParser.

    It keeps context and supports simple slot-filling follow-ups:
    - "send email" -> "Who should I send the email to?"
    - "joy@example.com" -> fills recipient
    - "set a timer" -> "How long?"
    - "10 minutes" -> fills timer duration
    """

    def __init__(self, parser: Optional[BlipParser] = None) -> None:
        self.parser = parser or BlipParser()
        self.context = BlipContext()
        self.pending_command: Optional[ParsedCommand] = None

    def handle(self, text: str) -> ConversationTurn:
        normalized = self.parser._normalize_text(text)

        if self.pending_command:
            completed = self._try_fill_pending(normalized, text)
            if completed:
                self.pending_command = None
                self._update_context(completed)
                return ConversationTurn(command=completed, context=self.context)

        command = self.parser.parse(text, self.context)
        if command.needs_clarification:
            self.pending_command = command
        else:
            self.pending_command = None
        self._update_context(command)
        return ConversationTurn(command=command, context=self.context)

    def _try_fill_pending(self, normalized: str, raw_text: str) -> Optional[ParsedCommand]:
        pending = self.pending_command
        if not pending:
            return None

        if pending.intent == "gmail.compose":
            email = self.parser._extract_email(normalized)
            if email:
                params = dict(pending.params)
                params["to"] = email
                text_tail = self.parser._extract_send_message_tail(normalized)
                if text_tail and not params.get("text"):
                    params["text"] = text_tail
                return ParsedCommand(
                    raw_text=raw_text,
                    normalized_text=normalized,
                    intent="gmail.compose",
                    target="gmail",
                    action="compose",
                    params=params,
                    confidence=0.9,
                )

        if pending.intent == "telegram.compose":
            params = dict(pending.params)
            if not params.get("chat_id") and normalized:
                params["chat_id"] = normalized
                return ParsedCommand(
                    raw_text=raw_text,
                    normalized_text=normalized,
                    intent="telegram.compose",
                    target="telegram",
                    action="compose",
                    params=params,
                    confidence=0.86,
                )

        if pending.intent == "timer.create":
            duration = self.parser._extract_duration(normalized)
            if duration:
                return ParsedCommand(
                    raw_text=raw_text,
                    normalized_text=normalized,
                    intent="timer.create",
                    target="timer",
                    action="create",
                    params=duration,
                    confidence=0.9,
                )

        if pending.intent in {"alarm.create", "reminder.create"}:
            when = self.parser._extract_time_expression(normalized)
            if when:
                return ParsedCommand(
                    raw_text=raw_text,
                    normalized_text=normalized,
                    intent=pending.intent,
                    target=pending.target,
                    action="create",
                    params={"when": when},
                    confidence=0.88,
                )

        return None

    def _update_context(self, command: ParsedCommand) -> None:
        self.context.last_intent = command.intent
        self.context.last_entity = command.target
        self.context.last_result = {
            "action": command.action,
            "params": dict(command.params),
            "confidence": command.confidence,
        }

        if command.target in BlipParser.OPENABLE_PANELS and command.action == "open":
            self.context.active_panel = command.target
        elif command.action == "open_inbox":
            self.context.active_panel = "gmail"
        elif command.action == "open_sent":
            self.context.active_panel = "gmail"
        elif command.action in {"open_music", "open_videos"}:
            self.context.active_panel = "youtube"
            self.context.active_media_type = "music" if command.action == "open_music" else "video"
        elif command.target == "youtube" and command.action in {"open", "play", "pause", "unmute", "mute", "next", "restart", "rewind", "forward"}:
            self.context.active_panel = "youtube"
            if command.action == "open":
                self.context.active_media_type = "video"
        elif command.target == "camera" and command.action == "open":
            self.context.active_panel = "camera"
        elif command.target == "media" and command.action in {"open", "open_recordings", "open_latest", "open_index"}:
            self.context.active_panel = "media"
        elif command.action == "close":
            if command.target == self.context.active_panel or command.target == "global":
                self.context.active_panel = None


if __name__ == "__main__":
    parser = BlipParser()
    engine = BlipConversationEngine(parser)
    samples = [
        ("hey blip", BlipContext()),
        ("set a timer for 10 minutes", BlipContext()),
        ("send email to joy@example.com saying hello from blip", BlipContext(active_panel="gmail")),
        ("send this photo on telegram to joy", BlipContext(active_panel="media", current_item_name="latest photo")),
        ("play quartet music on youtube", BlipContext()),
        ("unmute", BlipContext(active_panel="youtube", active_media_type="video")),
        ("open photo 3", BlipContext(active_panel="media")),
        ("what's in the hub", BlipContext()),
        ("send", BlipContext(active_panel="gmail")),
    ]
    for text, context in samples:
        print("-" * 72)
        print(text)
        print(parser.parse(text, context))
    print("-" * 72)
    print("conversation demo")
    for utterance in ["send email", "joy@example.com", "set a timer", "10 minutes", "play quartet music on youtube", "unmute"]:
        turn = engine.handle(utterance)
        print(utterance, "->", turn.command)
