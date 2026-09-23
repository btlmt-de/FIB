// Only public hand information is used. Jimbo never knows the hole card.
//
// Every situation has a few lines, and which one he says is picked from the table's
// open time (`seed`) - so every client in the room hears the same line, it does not
// change under the player as the component re-renders, and the next table sounds
// different. It used to be one line per situation, which the regulars would have
// heard word for word every time they busted.

// The welcome, while he shuffles.
const WELCOMES = [
    'Evening, high rollers. My table, my deck, my rules: beat my hand, stay under twenty-one.',
    'Pull up a chair. Let me give these a shuffle. An honest shuffle. Mostly honest.',
    'Welcome to the private table! Twenty-one wins, twenty-two does not, and I stand on seventeen.',
    'Ah, company. Sit, sit. The spins are on the house tonight. The cards, sadly, are on me.',
];

/** The line for this table out of `lines`. `salt` keeps two situations from moving in step. */
function pick(lines, seed, salt = 0) {
    return lines[Math.abs(Math.floor((seed ?? 0) / 1000) + salt) % lines.length];
}

export function welcomeLine(seed) {
    return pick(WELCOMES, seed);
}

/** Said as the hole card turns. Here rather than in the table so it varies with the rest. */
export function revealLine(seed) {
    return pick([
        'My turn. Let’s turn these over. No more secrets.',
        'Hands off the felt. Let’s see what I’ve been sitting on.',
        'Moment of truth. Try not to look too relieved.',
    ], seed, 7);
}

export function jimboLine({ mine, dealer, settled, intro, dealing, open, secondsLeft, intent, signedIn, seed }) {
    const say = (lines, salt) => pick(lines, seed, salt);
    if (intro && !settled) return welcomeLine(seed);
    if (settled) {
        if (!mine) return say([
            'That’s the table, folks. Same smile, fewer secrets.',
            'And that’s the hand. Next time, pull up a chair.',
        ], 1);
        if (mine.outcome === 'blackjack') return say([
            'A natural! I taught you absolutely none of that. You’re welcome.',
            'Blackjack. On my own table. I’d be proud if it weren’t so expensive.',
        ], 2);
        if (mine.outcome === 'win') return dealer?.bust
            ? say([
                'Well. The house has exceeded its own expectations. You win.',
                'I went over. Please don’t tell management.',
            ], 3)
            : say([
                'You got me. Take your spins before I develop a conscience.',
                'Beaten fair and square. I’ll be checking the deck later.',
            ], 3);
        if (mine.outcome === 'push') return say([
            'A tie. Let’s call it mutual respect and never speak of it again.',
            'Dead even. Neither of us will be telling this story.',
        ], 4);
        return mine.bust
            ? say([
                'One card too many. Happens to the best of us. And you.',
                'Twenty-one was right there. You just kept going.',
            ], 5)
            : say([
                'This one’s mine. You made me work for it, though.',
                'House takes it. Don’t worry, the spins were never yours to lose.',
            ], 5);
    }
    if (dealing) return say([
        'Easy now. Let me deal before you start making questionable decisions.',
        'Cards first, bravado second. Here they come.',
    ], 6);
    if (!open) return 'Decisions are in. My turn to pretend this is all skill.';
    if (!mine) return signedIn ? 'An empty chair and a perfectly trustworthy clown. What more could you want?' : 'Best seat in the house. Sign in and I’ll put your name on it.';
    if (mine.natural) return say([
        'Twenty-one in two. Show-off. Let’s see if I can keep up.',
        'A natural, first try. I’m going to need a minute.',
    ], 8);
    if (mine.bust) return say([
        'Over twenty-one. I admire the ambition. The cards did not.',
        'That’s ' + mine.total + '. Bold. Wrong, but bold.',
        'Ooh. Twenty-two and up is my side of the rules, friend.',
    ], 9);
    if (mine.done) return say([
        'Standing on ' + mine.total + '? Alright. Hands off the felt; leave the worrying to me.',
        mine.total + ' it is. Now we wait, and I pretend not to sweat.',
    ], 10);
    // Doing nothing is not doing nothing: the clock stands the hand when it runs out.
    if (secondsLeft <= 5) return 'Clock’s nearly out. Say nothing and you’re standing on ' + mine.total + '.';
    if (intent === 'hit') return mine.total >= 17 ? 'Another card on ' + mine.total + '? You do enjoy making me nervous.' : 'One more? Say the word. I even shuffled. Probably.';
    if (intent === 'stand') return 'Keep your ' + mine.total + ' and let me do the sweating? Fair enough.';
    if (mine.total === 21) return 'Twenty-one. That’s the ceiling, champ. Looking good.';
    if (mine.soft) return 'Soft ' + mine.total + '. That ace has a little flexibility. Unlike my contract.';
    if (mine.total >= 17) return say([
        mine.total + '. A very respectable hand. I would know. I have two.',
        mine.total + '. Most folks would stop here. Most folks.',
    ], 11);
    if (mine.total >= 12) return say([
        mine.total + '. Now it gets interesting. One more, or enough excitement?',
        mine.total + '. The awkward middle. Your call, champ.',
    ], 12);
    return 'You’ve got ' + mine.total + '. Plenty of table left. What’s your move?';
}
