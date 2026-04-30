export function createCalendarController(deps = {}) {
    const {
        isCalendarDateLike,
        createGoogleCalendarUrl,
        scheduleCalendarEventReminder,
        ensureGoogleCalendarConnected,
        getGoogleCalendarAuthState,
        createGoogleCalendarEvent,
        mergeCalendarCache,
        refreshOpenCalendarPanel,
        addToHub,
        buildCalendarReminderFollowUpText,
        queuePendingCalendarEvent,
        getCalendarAgendaVoiceRequest,
        getCalendarFocusDayVoiceRequest,
        getCalendarTimeSlotVoiceRequest,
        isCloseCalendarVoiceRequest,
        closeCalendarPanel,
        forceOpenCalendarOverview,
        focusCalendarDaySelection,
        focusCalendarHourSelection,
        formatCalendarDateKey,
        consoleRef = console,
    } = deps;

    async function createEventFromResponse(res = {}) {
        if (!res.event_details) return { text: res.text };
        const details = res.event_details || {};
        if (!details.start || !details.end) {
            return {
                text: (typeof res.text === 'string' && res.text.trim())
                    ? res.text
                    : 'I need a start and end time before I can create a calendar event.'
            };
        }
        if (!isCalendarDateLike(details.start) || !isCalendarDateLike(details.end)) {
            return {
                text: 'I need a clearer day and time before I can create that calendar event.'
            };
        }

        const url = createGoogleCalendarUrl(details);
        const eventTitle = details.title || details.summary || 'Event';
        const reminderStatus = scheduleCalendarEventReminder(details);
        await ensureGoogleCalendarConnected({ silent: true });
        const authState = getGoogleCalendarAuthState();

        if (authState.connected) {
            try {
                const event = await createGoogleCalendarEvent(details);
                const eventUrl = event?.htmlLink || url;
                mergeCalendarCache([{
                    id: event?.id || eventTitle,
                    summary: event?.summary || eventTitle,
                    start: event?.start?.dateTime || event?.start?.date || details.start,
                    end: event?.end?.dateTime || event?.end?.date || details.end,
                    htmlLink: eventUrl,
                    source: 'google'
                }]);
                await refreshOpenCalendarPanel();
                addToHub('link', `📅 Calendar Event: ${eventTitle}`, { url: eventUrl });
                return {
                    text: (typeof res.text === 'string' && res.text.trim())
                        ? res.text
                        : `I added ${eventTitle} to your Google Calendar.${buildCalendarReminderFollowUpText(details)}${reminderStatus.reason === 'too_late' ? ' Reminder skipped because the event is too soon.' : ''}`,
                    extraHtml: `<br><a href="${eventUrl}" target="_blank" class="action-link blue">📅 OPEN GOOGLE CALENDAR EVENT</a>`
                };
            } catch (error) {
                consoleRef.warn('Google Calendar event creation failed:', error?.message || error);
                if (error?.code === 'calendar_auth_required') {
                    const reconnected = await ensureGoogleCalendarConnected({ silent: true });
                    if (reconnected) {
                        try {
                            const event = await createGoogleCalendarEvent(details);
                            const eventUrl = event?.htmlLink || url;
                            mergeCalendarCache([{
                                id: event?.id || eventTitle,
                                summary: event?.summary || eventTitle,
                                start: event?.start?.dateTime || event?.start?.date || details.start,
                                end: event?.end?.dateTime || event?.end?.date || details.end,
                                htmlLink: eventUrl,
                                source: 'google'
                            }]);
                            await refreshOpenCalendarPanel();
                            addToHub('link', `📅 Calendar Event: ${eventTitle}`, { url: eventUrl });
                            return {
                                text: (typeof res.text === 'string' && res.text.trim())
                                    ? res.text
                                    : `I added ${eventTitle} to your Google Calendar.${buildCalendarReminderFollowUpText(details)}${reminderStatus.reason === 'too_late' ? ' Reminder skipped because the event is too soon.' : ''}`,
                                extraHtml: `<br><a href="${eventUrl}" target="_blank" class="action-link blue">📅 OPEN GOOGLE CALENDAR EVENT</a>`
                            };
                        } catch (retryError) {
                            consoleRef.warn('Google Calendar event retry failed:', retryError?.message || retryError);
                        }
                    }
                } else {
                    return {
                        text: `I could not save that event directly to Google Calendar, so I made a backup link for ${eventTitle}.`,
                        extraHtml: `<br><a href="${url}" target="_blank" class="action-link blue">📅 ADD TO GOOGLE CALENDAR</a>`
                    };
                }
            }
        }

        queuePendingCalendarEvent(details);
        await refreshOpenCalendarPanel();
        addToHub('link', `📅 Calendar Event: ${eventTitle}`, { url });
        return {
            text: (typeof res.text === 'string' && res.text.trim())
                ? `${res.text} I also saved it in Blip and will sync it to Google Calendar when you reconnect.`
                : `I saved ${eventTitle} in Blip and will sync it to Google Calendar when you reconnect. I also made a calendar link for now.${buildCalendarReminderFollowUpText(details)}${reminderStatus.reason === 'too_late' ? ' Reminder skipped because the event is too soon.' : ''}`,
            extraHtml: `<br><a href="${url}" target="_blank" class="action-link blue">📅 ADD TO GOOGLE CALENDAR</a>`
        };
    }

    async function handleVoiceCommand(command = '', options = {}) {
        const rawText = String(command || '').trim();
        if (options.event_details) {
            return createEventFromResponse({ text: options.text || '', event_details: options.event_details });
        }

        if (isCloseCalendarVoiceRequest(rawText)) {
            return {
                ok: true,
                text: closeCalendarPanel() ? 'Calendar closed.' : 'Calendar is already closed.'
            };
        }

        const focusDay = getCalendarFocusDayVoiceRequest(rawText);
        if (focusDay) {
            const result = await focusCalendarDaySelection(focusDay.dayNumber, {
                toggle: false,
                anchorDate: focusDay.anchorDate
            });
            const overview = await refreshOpenCalendarPanel();
            return { ...result, extraHtml: overview?.extraHtml || '' };
        }

        const focusHour = getCalendarTimeSlotVoiceRequest(rawText);
        if (focusHour) {
            const result = await focusCalendarHourSelection(focusHour.hour);
            const overview = await refreshOpenCalendarPanel();
            return { ...result, extraHtml: overview?.extraHtml || '' };
        }

        const agendaRequest = getCalendarAgendaVoiceRequest(rawText) || {
            label: 'upcoming',
            view: 'month'
        };
        const overview = await forceOpenCalendarOverview(agendaRequest);
        return {
            ok: true,
            text: overview?.text || 'Blip Calendar open.',
            extraHtml: overview?.extraHtml || ''
        };
    }

    async function focusEventDay(details = {}) {
        return refreshOpenCalendarPanel() || forceOpenCalendarOverview({
            label: 'event day',
            view: 'month',
            anchorDate: details?.start,
            selectedDate: formatCalendarDateKey(details?.start || new Date())
        }).catch(() => null);
    }

    return {
        createEventFromResponse,
        focusEventDay,
        handleVoiceCommand,
    };
}
