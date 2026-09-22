// Only public hand information is used. Jimbo never knows the hole card.
export function jimboLine({ mine, dealer, settled, dealing, open, secondsLeft, intent, signedIn }) {
    if (settled) {
        if (!mine) return 'That’s the table, folks. Same smile, fewer secrets.';
        if (mine.outcome === 'blackjack') return 'A natural! I taught you absolutely none of that. You’re welcome.';
        if (mine.outcome === 'win') return dealer?.bust ? 'Well. The house has exceeded its own expectations. You win.' : 'You got me. Take your spins before I develop a conscience.';
        if (mine.outcome === 'push') return 'A tie. Let’s call it mutual respect and never speak of it again.';
        return mine.bust ? 'One card too many. Happens to the best of us. And you.' : 'This one’s mine. You made me work for it, though.';
    }
    if (dealing) return 'Easy now. Let me deal before you start making questionable decisions.';
    if (!open) return 'Decisions are in. My turn to pretend this is all skill.';
    if (!mine) return signedIn ? 'An empty chair and a perfectly trustworthy clown. What more could you want?' : 'Best seat in the house. Sign in and I’ll put your name on it.';
    if (mine.natural) return 'Twenty-one in two. Show-off. Let’s see if I can keep up.';
    if (mine.bust) return 'Over twenty-one. I admire the ambition. The cards did not.';
    if (mine.done) return 'Standing on ' + mine.total + '? Alright. Hands off the felt; leave the worrying to me.';
    if (secondsLeft <= 5) return 'Clock’s nearly out. One more card, or are we leaving it there?';
    if (intent === 'hit') return mine.total >= 17 ? 'Another card on ' + mine.total + '? You do enjoy making me nervous.' : 'One more? Say the word. I even shuffled. Probably.';
    if (intent === 'stand') return 'Keep your ' + mine.total + ' and let me do the sweating? Fair enough.';
    if (mine.total === 21) return 'Twenty-one. That’s the ceiling, champ. Looking good.';
    if (mine.soft) return 'Soft ' + mine.total + '. That ace has a little flexibility. Unlike my contract.';
    if (mine.total >= 17) return mine.total + '. A very respectable hand. I would know. I have two.';
    if (mine.total >= 12) return mine.total + '. Now it gets interesting. One more, or enough excitement?';
    return 'You’ve got ' + mine.total + '. Plenty of table left. What’s your move?';
}
