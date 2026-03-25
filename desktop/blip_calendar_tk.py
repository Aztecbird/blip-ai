#!/usr/bin/env python3
"""
Optional desktop date picker (Tkinter) — not used by the web app.

  pip install tkcalendar

Run:  python3 desktop/blip_calendar_tk.py
"""

from __future__ import annotations

import sys
from datetime import date

try:
    import tkinter as tk
    from tkinter import messagebox
except ImportError as e:
    print("Tkinter is required (usually bundled with Python).", e)
    sys.exit(1)

try:
    from tkcalendar import Calendar
except ImportError:
    print("Install: pip install tkcalendar")
    sys.exit(1)


class BlipCalendar:
    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("Blip Calendar")
        self.root.geometry("420x500")
        self.root.resizable(False, False)

        try:
            self.root.attributes("-alpha", 0.95)
        except tk.TclError:
            pass

        self.root.configure(bg="#07182e")

        self.outer = tk.Frame(self.root, bg="#07182e", highlightthickness=0)
        self.outer.pack(fill="both", expand=True, padx=14, pady=14)

        self.card = tk.Frame(
            self.outer,
            bg="#0d2b52",
            bd=0,
            relief="flat",
            highlightbackground="#4fc3ff",
            highlightthickness=1,
        )
        self.card.pack(fill="both", expand=True)

        self.header = tk.Frame(self.card, bg="#123a6b", height=72)
        self.header.pack(fill="x")
        self.header.pack_propagate(False)

        self.title_label = tk.Label(
            self.header,
            text="Blip Calendar",
            font=("Helvetica", 20, "bold"),
            fg="#dff6ff",
            bg="#123a6b",
        )
        self.title_label.pack(side="left", padx=18, pady=18)

        self.status_dot = tk.Canvas(
            self.header, width=18, height=18, bg="#123a6b", highlightthickness=0
        )
        self.status_dot.pack(side="right", padx=18)
        self.status_dot.create_oval(3, 3, 15, 15, fill="#59d8ff", outline="")

        self.subtitle = tk.Label(
            self.card,
            text="Soft blue glass-style date picker for Blip",
            font=("Helvetica", 10),
            fg="#9fdcff",
            bg="#0d2b52",
        )
        self.subtitle.pack(pady=(14, 10))

        self.calendar_holder = tk.Frame(self.card, bg="#0d2b52")
        self.calendar_holder.pack(pady=6)

        self.calendar = Calendar(
            self.calendar_holder,
            selectmode="day",
            date_pattern="yyyy-mm-dd",
            font=("Helvetica", 11),
            background="#1f5fa8",
            foreground="white",
            bordercolor="#4fc3ff",
            headersbackground="#16457c",
            headersforeground="#dff6ff",
            normalbackground="#0f2f57",
            normalforeground="#dff6ff",
            weekendbackground="#123765",
            weekendforeground="#bfefff",
            selectbackground="#59d8ff",
            selectforeground="#06213e",
            othermonthbackground="#0b2342",
            othermonthforeground="#5f90b8",
            othermonthwebackground="#0b2342",
            othermonthweforeground="#5f90b8",
        )
        self.calendar.pack(padx=12, pady=12)

        self.selected_label = tk.Label(
            self.card,
            text="Selected date: " + self.calendar.get_date(),
            font=("Helvetica", 12, "bold"),
            fg="#dff6ff",
            bg="#0d2b52",
        )
        self.selected_label.pack(pady=(8, 14))

        self.calendar.bind("<<CalendarSelected>>", self.update_selected_date)

        self.button_row = tk.Frame(self.card, bg="#0d2b52")
        self.button_row.pack(pady=(0, 18))

        self.use_button = tk.Button(
            self.button_row,
            text="Use Date",
            command=self.use_date,
            font=("Helvetica", 11, "bold"),
            bg="#59d8ff",
            fg="#06213e",
            activebackground="#84e5ff",
            activeforeground="#06213e",
            bd=0,
            padx=18,
            pady=10,
            cursor="hand2",
        )
        self.use_button.pack(side="left", padx=8)

        self.today_button = tk.Button(
            self.button_row,
            text="Today",
            command=self.go_today,
            font=("Helvetica", 11),
            bg="#1a4f8e",
            fg="#dff6ff",
            activebackground="#2465b4",
            activeforeground="#ffffff",
            bd=0,
            padx=18,
            pady=10,
            cursor="hand2",
        )
        self.today_button.pack(side="left", padx=8)

        self.close_button = tk.Button(
            self.button_row,
            text="Close",
            command=self.root.destroy,
            font=("Helvetica", 11),
            bg="#10345f",
            fg="#9fdcff",
            activebackground="#16457c",
            activeforeground="#ffffff",
            bd=0,
            padx=18,
            pady=10,
            cursor="hand2",
        )
        self.close_button.pack(side="left", padx=8)

    def update_selected_date(self, _event=None) -> None:
        self.selected_label.config(text="Selected date: " + self.calendar.get_date())

    def use_date(self) -> None:
        chosen = self.calendar.get_date()
        messagebox.showinfo("Blip Calendar", f"Chosen date: {chosen}")

    def go_today(self) -> None:
        self.calendar.selection_set(date.today())
        self.update_selected_date()


def open_blip_calendar() -> None:
    root = tk.Tk()
    BlipCalendar(root)
    root.mainloop()


if __name__ == "__main__":
    open_blip_calendar()
