import {MessageAction, StreamMessage} from "./StreamMessage.js";
import {addSource} from "./chat.js";

const history = [
    {id: "1", userName: "Sam", source: "youtube", message: "Good morning, folks! 🌞"},
    {id: "2", userName: "Jordan", source: "twitch", message: "Hey hey! Morning! How’s everyone doing today?"},
    {id: "3", userName: "Alex", source: "discord", message: "Morning! Feeling decent. Coffee’s kicking in finally ☕😅"},
    {id: "4", userName: "Sam", source: "youtube", message: "Haha, same here. First sip is magic."},
    {id: "5", userName: "Jordan", source: "twitch", message: "I went for a walk earlier—weather’s actually nice today?!"},
    {id: "6", userName: "Alex", source: "discord", message: "No way. Still gloomy here. What’s your secret?"},
    {id: "7", userName: "Jordan", source: "twitch", message: "Just lucky, I guess! Some sunshine and breeze."},
    {id: "8", userName: "Sam", source: "youtube", message: "Ugh jealous. It’s been raining here since like… Monday."},
    {id: "9", userName: "Alex", source: "discord", message: "I love rain tho. Feels cozy."},
    {id: "10", userName: "Jordan", source: "twitch", message: "Depends if I have to leave the house or not 😅"},
    {id: "11", userName: "Sam", source: "youtube", message: "Exactly! Rain is perfect if I can stay under a blanket lol"},
    {id: "12", userName: "Alex", source: "discord", message: "That sounds like a good plan tbh. Blanket + snacks."},
    {id: "13", userName: "Jordan", source: "twitch", message: "Speaking of snacks… anyone else been on a popcorn kick lately?"},
    {id: "14", userName: "Sam", source: "youtube", message: "YES. I keep making it at home. Addictive."},
    {id: "15", userName: "Alex", source: "discord", message: "I just tried popcorn with truffle salt. Fancy AND delicious."},
    {id: "16", userName: "Jordan", source: "twitch", message: "Ooh I need to try that! I usually just drown it in butter 😂"},
    {id: "17", userName: "Sam", source: "youtube", message: "Nothing wrong with classic butter!"},
    {id: "18", userName: "Alex", source: "discord", message: "True. Although kettle corn is underrated."},
    {id: "19", userName: "Jordan", source: "twitch", message: "Agreed. Sweet and salty is elite."},
    {id: "20", userName: "Sam", source: "youtube", message: "Ok now I want popcorn for lunch 😅"},
    {id: "21", userName: "Alex", source: "discord", message: "Live your truth."},
    {id: "22", userName: "Jordan", source: "twitch", message: "Treat yourself lol"},
    {id: "23", userName: "Sam", source: "youtube", message: "😂 Might just do it"},
    {id: "24", userName: "Alex", source: "discord", message: "What’s everyone up to today anyway?"},
    {id: "25", userName: "Jordan", source: "twitch", message: "Just workin’. Got a few meetings, but mostly chill."},
    {id: "26", userName: "Sam", source: "youtube", message: "Same. Some admin stuff, then maybe some writing."},
    {id: "27", userName: "Alex", source: "discord", message: "Ooo what are you writing?"},
    {id: "28", userName: "Sam", source: "youtube", message: "Just a blog post. Nothing too serious."},
    {id: "29", userName: "Jordan", source: "twitch", message: "Still counts! I admire people who blog consistently."},
    {id: "30", userName: "Alex", source: "discord", message: "Yeah, I always start and never finish 😅"},
    {id: "31", userName: "Sam", source: "youtube", message: "Haha I do that too tbh. I just push myself to hit publish."},
    {id: "32", userName: "Jordan", source: "twitch", message: "That’s the way! Done is better than perfect."},
    {id: "33", userName: "Alex", source: "discord", message: "Big facts."},
    {id: "34", userName: "Sam", source: "youtube", message: "What about you, Alex? What’s your day look like?"},
    {id: "35", userName: "Alex", source: "discord", message: "Bit of design work, bit of procrastination 😄"},
    {id: "36", userName: "Jordan", source: "twitch", message: "A classic combo lol"},
    {id: "37", userName: "Sam", source: "youtube", message: "Truly the freelancer’s rhythm 😆"},
    {id: "38", userName: "Alex", source: "discord", message: "Yup. Productive chaos."},
    {id: "39", userName: "Jordan", source: "twitch", message: "I love that term—“productive chaos.” Stealing it."},
    {id: "40", userName: "Alex", source: "discord", message: "Please do 😂"},
    {id: "41", userName: "Sam", source: "youtube", message: "I should put that on a mug."},
    {id: "42", userName: "Jordan", source: "twitch", message: "Or a hoodie!"},
    {id: "43", userName: "Alex", source: "discord", message: "Merch ideas incoming haha"},
    {id: "44", userName: "Sam", source: "youtube", message: "“Team Productive Chaos”"},
    {id: "45", userName: "Jordan", source: "twitch", message: "I’d wear that to all my Zoom meetings 😎"},
    {id: "46", userName: "Alex", source: "discord", message: "Mood"},
    {id: "47", userName: "Sam", source: "youtube", message: "What’s everyone having for lunch later?"},
    {id: "48", userName: "Jordan", source: "twitch", message: "Leftover pasta! Garlic overload but worth it."},
    {id: "49", userName: "Alex", source: "discord", message: "Mmm yum. I think I’ll do a sandwich situation."},
    {id: "50", userName: "Sam", source: "youtube", message: "No clue yet. Maybe order something?"},
    {id: "51", userName: "Jordan", source: "twitch", message: "Do it! Friday deserves takeout."},
    {id: "52", userName: "Alex", source: "discord", message: "Friday = Treat Day"},
    {id: "53", userName: "Sam", source: "youtube", message: "Ok you’ve convinced me 😂"},
    {id: "54", userName: "Jordan", source: "twitch", message: "That was easy haha"},
    {id: "55", userName: "Alex", source: "discord", message: "We’re enablers, not influencers 😄"},
    {id: "56", userName: "Sam", source: "youtube", message: "Dangerous group to chat with lol"},
    {id: "57", userName: "Jordan", source: "twitch", message: "Only slightly 😇"},
    {id: "58", userName: "Alex", source: "discord", message: "On a scale from 1 to chaotic, we’re like a soft 7."},
    {id: "59", userName: "Sam", source: "youtube", message: "Perfectly balanced."},
    {id: "60", userName: "Jordan", source: "twitch", message: "Like a well-brewed cup of tea."},
    {id: "61", userName: "Alex", source: "discord", message: "Speaking of—anyone got tea recs?"},
    {id: "62", userName: "Sam", source: "youtube", message: "Yes! I just tried a peach oolong that blew my mind."},
    {id: "63", userName: "Jordan", source: "twitch", message: "That sounds fancy af."},
    {id: "64", userName: "Alex", source: "discord", message: "I’m intrigued. Where’d you get it?"},
    {id: "65", userName: "Sam", source: "youtube", message: "Local tea shop! I can send the link later."},
    {id: "66", userName: "Jordan", source: "twitch", message: "Please do! I need to spice up my tea game."},
    {id: "67", userName: "Alex", source: "discord", message: "Same here. Tired of plain green."},
    {id: "68", userName: "Sam", source: "youtube", message: "Variety is the spice of sip."},
    {id: "69", userName: "Jordan", source: "twitch", message: "😆 That needs to go on the mug too."},
    {id: "70", userName: "Alex", source: "discord", message: "Merch line is writing itself"},
    {id: "71", userName: "Sam", source: "youtube", message: "Seriously though"},
    {id: "72", userName: "Jordan", source: "twitch", message: "What about weekend plans? Anything fun coming up?"},
    {id: "73", userName: "Alex", source: "discord", message: "Might go hiking if the weather holds."},
    {id: "74", userName: "Sam", source: "youtube", message: "Oh nice! Where?"},
    {id: "75", userName: "Alex", source: "discord", message: "Just a trail nearby. Nothing too intense."},
    {id: "76", userName: "Jordan", source: "twitch", message: "Still counts. I miss hiking tbh."},
    {id: "77", userName: "Sam", source: "youtube", message: "Same. Haven’t been in months."},
    {id: "78", userName: "Alex", source: "discord", message: "Let’s all go on a virtual hike 😂"},
    {id: "79", userName: "Jordan", source: "twitch", message: "I’ll bring the snacks"},
    {id: "80", userName: "Sam", source: "youtube", message: "I’ll bring the playlist"},
    {id: "81", userName: "Alex", source: "discord", message: "I’ll bring the vibes"},
    {id: "82", userName: "Jordan", source: "twitch", message: "Perfect team"},
    {id: "83", userName: "Sam", source: "youtube", message: "Unstoppable trio"},
    {id: "84", userName: "Alex", source: "discord", message: "Honestly love our chats. Chillest part of my day."},
    {id: "85", userName: "Jordan", source: "twitch", message: "Same! Always puts me in a good mood."},
    {id: "86", userName: "Sam", source: "youtube", message: "Aww you guys are sweet 😊"},
    {id: "87", userName: "Alex", source: "discord", message: "We’re just a wholesome group, what can I say"},
    {id: "88", userName: "Jordan", source: "twitch", message: "Manifesting more group chats like this everywhere"},
    {id: "89", userName: "Sam", source: "youtube", message: "World peace through chill vibes"},
    {id: "90", userName: "Alex", source: "discord", message: "And popcorn"},
    {id: "91", userName: "Jordan", source: "twitch", message: "Obviously"},
    {id: "92", userName: "Sam", source: "youtube", message: "It’s a necessity"},
    {id: "93", userName: "Alex", source: "discord", message: "Ok time to pretend to be productive again"},
    {id: "94", userName: "Jordan", source: "twitch", message: "Lol same. Catch you both later?"},
    {id: "95", userName: "Sam", source: "youtube", message: "Definitely! Let’s chat again soon"},
    {id: "96", userName: "Alex", source: "discord", message: "Always down"},
    {id: "97", userName: "Jordan", source: "twitch", message: "Bye for now, friends!"},
    {id: "98", userName: "Sam", source: "youtube", message: "Byeee 👋"},
    {id: "99", userName: "Alex", source: "discord", message: "Ciao ciao 👋"},
    {id: "100", userName: "Jordan", source: "twitch", message: "✨Peace out, team Productive Chaos✨"},
];

export async function init(renewToken: boolean = false) {
    const state = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(state);
    if (params.has("demo")) console.info("Demo init");
}

let source: AsyncGenerator<StreamMessage, void, unknown>;
export async function start() {
    const state = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(state);
    if (source) source.return();
    if (params.has("demo")) {
        source = demoChat(parseInt(params.get("demo") || "2000"));
        addSource(source);
        console.info("Demo start");
    }
}

export default async function* demoChat(speed: number): AsyncGenerator<StreamMessage, void, unknown> {
    while (true) {
        for (const m of history) {
            yield {...m, action: MessageAction.New, timestamp: Date.now()};
            await new Promise(resolve=>setTimeout(resolve, Math.random()*speed));
        }
    }
}
