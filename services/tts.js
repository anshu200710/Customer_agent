import twilio from 'twilio';

const VoiceResponse = twilio.twiml.VoiceResponse;

/**
 * Generate SSML for better speech quality
 */
export function toSSML(text) {
    if (!text) return '<speak>Ji.</speak>';

    let sanitized = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Add natural pauses after Hindi sentence endings
    sanitized = sanitized.replace(/([।\.!?])\s+/g, '$1<break time="250ms"/> ');

    return `<speak><prosody rate="medium" pitch="+1st">${sanitized}</prosody></speak>`;
}

/**
 * Generate SSML for ID/number reading (slower pace)
 */
export function toSSMLId(idStr) {
    const digits = String(idStr).split('').join('<break time="200ms"/>');
    return `<speak><prosody rate="slow">${digits}</prosody></speak>`;
}

/**
 * Add speech gathering to TwiML response
 * @param {VoiceResponse} twiml - Twilio VoiceResponse object
 * @param {string} text - Text to speak
 */
export function speak(twiml, text) {
    const gather = twiml.gather({
        input: 'speech dtmf',
        language: 'hi-IN',
        speechTimeout: 'auto',
        timeout: 5,
        maxSpeechTime: 12,
        actionOnEmptyResult: true,
        action: '/voice/process',
        method: 'POST',
        enhanced: true,
        speechModel: 'phone_call',
    });

    gather.say({
        voice: 'Google.hi-IN-Wavenet-D',
        language: 'hi-IN'
    }, text);
}

/**
 * Say text without gathering (final message)
 * @param {VoiceResponse} twiml - Twilio VoiceResponse object
 * @param {string} text - Text to speak
 */
export function sayRaw(twiml, text) {
    twiml.say({
        voice: 'Google.hi-IN-Wavenet-D',
        language: 'hi-IN'
    }, text);
}

/**
 * Generate TwiML for playing audio file
 * @param {VoiceResponse} twiml - Twilio VoiceResponse object
 * @param {string} audioUrl - URL of audio file
 */
export function playAudio(twiml, audioUrl) {
    twiml.play(audioUrl);
}

/**
 * Create pause in TwiML
 * @param {VoiceResponse} twiml - Twilio VoiceResponse object
 * @param {number} seconds - Pause duration in seconds
 */
export function pause(twiml, seconds = 1) {
    twiml.pause({ length: seconds });
}

export default { speak, sayRaw, playAudio, pause, toSSML, toSSMLId };