export default function chatTTS(event: Event) {
    // TODO refactor to accept StreamMessage argument instead. Keep all dom logic in chat.ts
    const target = event.currentTarget! as HTMLElement;
    const username = target.querySelector('.username')!.textContent;
    const message = target.querySelector('.message')!.textContent;
    const source = target.dataset['source'];
    speak(`${username} on ${source} says ${message}.`);
}

export function init() {
    speechSynthesis.getVoices();  // Trigger loading of voices
}

export function speak(text: string) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    let voice;
    if (speechSynthesis.getVoices().length === 1) voice = speechSynthesis.getVoices()[0];
    if (!voice) voice = speechSynthesis.getVoices().find(voice=>voice.voiceURI === localStorage.getItem('synthVoice'));
    if (!voice) voice = speechSynthesis.getVoices().find(voice=>voice.default);
    if (!voice) {
        console.error("No default voice found");
        return;
    }
    utterance.voice = voice;
    utterance.pitch = parseInt(localStorage.getItem('synthPitch') || "1");
    utterance.rate = parseInt(localStorage.getItem('synthRate') || "1");
    speechSynthesis.speak(utterance);
}