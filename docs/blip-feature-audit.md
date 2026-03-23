# Blip Feature Audit

Status legend:
- `confirmed`: flow is implemented and reachable in current code
- `partial`: code exists but reachability or UX is unreliable
- `missing`: listed capability is not currently wired into the main flow

## Camera

1. `confirmed` Open camera
2. `confirmed` Close camera
3. `confirmed` Take photo
4. `confirmed` Start video recording
5. `confirmed` Stop video recording
6. `confirmed` Save latest photo to gallery
7. `confirmed` Save current vision/photo to Hub

## Media Gallery

8. `confirmed` Open media gallery
9. `confirmed` Close media gallery
10. `confirmed` Open latest shot
11. `confirmed` Open shot by number
12. `confirmed` Open latest video clip

## YouTube / Video

13. `partial` Search/open YouTube video
   Notes: direct video and in-panel controls exist, but in-panel search quality depends on available YouTube result data and autoplay starts muted by browser policy.
14. `confirmed` Reopen last video in panel
15. `confirmed` Make video big
16. `confirmed` Make video small
17. `confirmed` Make Blip big beside video
18. `confirmed` Make Blip small beside video
19. `confirmed` Pause video
20. `confirmed` Play/resume video
21. `confirmed` Stop video
22. `confirmed` Rewind video
23. `confirmed` Forward video
24. `confirmed` Next video
25. `confirmed` Restart video
26. `confirmed` Mute video
27. `confirmed` Unmute video
28. `confirmed` Change video volume
   Notes: now explicit `video/youtube/player volume`; generic `volume` controls Blip speech.

## Charts

29. `confirmed` Create chart/graph from inline voice data
30. `confirmed` Open graph
31. `confirmed` Close graph
32. `confirmed` Save graph to creations

## Designs

33. `confirmed` Create design/drawing
34. `confirmed` Show design
35. `confirmed` Save design to creations

## Maps

36. `confirmed` Open map
37. `confirmed` Show route from A to B
38. `confirmed` Reopen last map
39. `confirmed` Close map
40. `confirmed` Save map to creations

## Recipes

41. `confirmed` Generate recipe
42. `confirmed` Save recipe to creations

## Search / Info

43. `confirmed` Web search
44. `confirmed` Weather lookup
45. `confirmed` Time lookup
46. `confirmed` Product lookup

## Calendar / Hub

47. `partial` Create calendar event link
   Notes: direct day/time phrases are now wired; more complex phrasing still needs browser validation.
48. `confirmed` Open Hub
49. `confirmed` Save items to Hub
50. `confirmed` Review Hub items

## Timers / Alerts

51. `confirmed` Set timer by direct voice command
52. `confirmed` Trigger reminder/alarm alert
53. `confirmed` Close alert/reminder/timer

## System Controls

54. `confirmed` Wake Blip
55. `confirmed` Sleep mode
56. `confirmed` Close everything
57. `confirmed` Scroll up
58. `confirmed` Scroll down
59. `confirmed` Make Blip bigger
60. `confirmed` Make Blip smaller
61. `confirmed` Reset Blip size

## Personalization

62. `confirmed` Change hat
63. `confirmed` Change glasses
64. `confirmed` Change eye color
65. `confirmed` Change aura color
66. `confirmed` Reset style

## First Fix Targets

1. Browser-test timer, camera, and YouTube state transitions
2. Broaden calendar phrase parsing beyond direct day/time patterns
3. Add direct voice commands for Hub note deletion/editing if needed
4. Run a pass on edge-case product/weather phrasing

## Core API Stability Focus

Priority stack for the next focused phase:

1. `Gemini text/reasoning`
   Notes: core routing works; added safer Gemini network errors and better malformed-response fallback.
2. `Gemini TTS`
   Notes: tiered voice flow works; remaining risk is browser/device playback variance, not routing.
3. `Gemini image generation`
   Notes: multimodal explain flow now survives partial failure; text can still return even if image generation fails.
4. `YouTube Data API`
   Notes: control recovery is stronger now; browser validation still needed for autoplay/mute behavior.
5. `Maps / places`
   Notes: added timeout/caching guards in web service layer; still needs real browser validation for different place phrasing.
6. `Calendar`
   Notes: direct scheduling works for simple phrases; complex natural phrasing remains the main parser gap.
7. `Weather`
   Notes: added timeout/caching/input validation; should now fail softer on bad network responses.
8. `Product search / shopping links`
   Notes: cart and Amazon scoping are wired; next risk area is broader retailer/query phrasing.
