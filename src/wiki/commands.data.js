/**
 * Every command the plugin registers, in players' words.
 *
 * Hand-written, because the plugin's own descriptions are for the plugin ("Fix skips",
 * and one that reads "uhhh I guess this is self explanatory?"). What is NOT made up:
 * the list itself and who and when. Each entry was checked against the plugin on main
 * (Sept 2026): its registration in build.gradle.kts, its usage, its preconditions()
 * (OP, OP_WHEN_EVENT, ROUND_RUNNING, PAUSED, PRE_GAME, a setting) and any requireOp()
 * inside a subcommand. That audit removed /trade, which the plugin does not register,
 * and added /collection, which the page had never listed.
 *
 * scripts/vendor-pool.mjs compares the names here with the plugin's registrations on
 * every build and prints a [WARNING] when they differ, so the next command added to
 * the plugin shows up as a warning rather than as a gap nobody notices. A command left
 * off on purpose goes in UNLISTED instead, so the check knows it is not a gap.
 *
 *   who     'all' everyone, 'op' operators, 'event' operators when the Event setting is
 *           on (Precondition.OP_WHEN_EVENT), everyone otherwise
 *   when    the conditions the plugin checks before it runs, in words
 *   service needs the FIB service, which only runs on McPlayHD.net
 *   forms   the ways to type it; a form can narrow who (a subcommand behind requireOp)
 */

export const GROUPS = [
    { key: 'item', name: 'Your item' },
    { key: 'moving', name: 'Getting around' },
    { key: 'kit', name: 'Your kit' },
    { key: 'people', name: 'Talking and teams' },
    { key: 'records', name: 'Stats and collection', note: 'These read and write the FIB service, which only runs on McPlayHD.net. On a server you host yourself they have nothing to connect to, and nothing in a self-hosted round is recorded.' },
    { key: 'round', name: 'Running a round', note: 'For the operators running the game.' },
];

export const COMMANDS = [
    // ── Your item
    { name: 'info', group: 'item', who: 'all', forms: [
        { args: '', text: 'During a round: the item you are hunting, its /info description and its recipes. Otherwise: the item in your hand.' },
        { args: '<item>', text: 'The same for any item.', example: '/info wooden_axe' },
    ] },
    { name: 'infowiki', group: 'item', who: 'all', forms: [
        { args: '', text: 'A link to the Minecraft Wiki page for your current item.' },
    ] },

    // ── Getting around
    { name: 'spawn', group: 'moving', who: 'all', when: ['Not while paused'], forms: [
        { args: '', text: 'Teleports you to the round\'s spawn.' },
    ] },
    { name: 'bed', group: 'moving', who: 'all', when: ['Not while paused'], forms: [
        { args: '', text: 'Teleports you to your bed, if you have set one.' },
    ] },
    { name: 'pos', group: 'moving', who: 'event', when: ['With Positions on', 'Players in the round'], forms: [
        { args: '<name>', text: 'Saves where you stand under that name, for everyone. If the name is already saved, it points you to it instead.', example: '/pos village' },
        { args: '', text: 'Lists every saved position. /pos list does the same.' },
        { args: 'remove <name>', text: 'Removes a saved position.' },
    ] },
    { name: 'help', group: 'moving', who: 'all', forms: [
        { args: '', text: 'Lists every command you can use.' },
    ] },
    { name: 'ping', group: 'moving', who: 'all', forms: [
        { args: '', text: 'Shows your ping.' },
    ] },

    // ── Your kit
    { name: 'bp', group: 'kit', who: 'all', when: ['During a round'], forms: [
        { args: '', text: 'Opens your backpack (your team\'s, in a team round).' },
    ] },
    { name: 'fixskips', group: 'kit', who: 'all', when: ['During a round'], forms: [
        { args: '', text: 'Gives you back the jokers you have left, if the stack went missing.' },
    ] },
    { name: 'fixlocate', group: 'kit', who: 'all', forms: [
        { args: '[name | all]', text: 'Dismisses a locator\'s bossbar and trail, or all of them.', example: '/fixlocate all' },
    ] },

    // ── Talking and teams
    { name: 'shout', group: 'people', who: 'all', forms: [
        { args: '<message>', text: 'Sends one message to everyone, when chat would otherwise go to your team.', example: '/shout anyone got string?' },
        { args: '', text: 'Turns shout mode on or off: while it is on, everything you say goes to everyone.' },
    ] },
    { name: 'teams', group: 'people', who: 'all', when: ['With Teams on'], forms: [
        { args: 'invite <player>', text: 'Asks a player to team up.', example: '/teams invite Steve' },
        { args: 'accept <player>', text: 'Accepts an invitation.' },
        { args: 'decline <player>', text: 'Declines one.' },
        { args: 'leave', text: 'Leaves your team.' },
        { args: 'list', text: 'Lists the teams.' },
    ] },
    { name: 'voteskip', group: 'people', who: 'all', when: ['During a round', 'In Run Battle', 'Needs a joker'], forms: [
        { args: '', text: 'Puts the current item to a vote of everyone playing. If it carries, the item is skipped for the whole server and you pay a joker; a tie is a coin flip.' },
    ] },
    { name: 'vote', group: 'people', who: 'all', when: ['During a round'], forms: [
        { args: 'yes | no', text: 'Votes in a skip vote that is open.' },
        { args: 'cancel', text: 'Cancels the vote.', who: 'op' },
    ] },

    // ── Stats and collection (the FIB service)
    { name: 'stats', group: 'records', who: 'all', service: true, forms: [
        { args: '[player]', text: 'Your stats across every recorded round, or someone else\'s.', example: '/stats Steve' },
        { args: 'solo | duo | team [player]', text: 'The same, narrowed to one kind of round.' },
        { args: 'reset', text: 'Wipes every recorded stat, after a confirmation.', who: 'op' },
    ] },
    { name: 'top', group: 'records', who: 'all', service: true, forms: [
        { args: '[solo | duo | teams | achievements] [stat]', text: 'The leaderboards.', example: '/top solo items' },
    ] },
    { name: 'collection', group: 'records', who: 'all', service: true, forms: [
        { args: '[player]', text: 'Opens your collection book, or another player\'s.' },
    ] },
    { name: 'achievements', group: 'records', who: 'all', service: true, forms: [
        { args: '', text: 'Opens the achievements menu with your progress.' },
        { args: 'grant | revoke | reset <player> [achievement]', text: 'Hands out or takes back achievements.', example: '/achievements grant Steve b2b_king', who: 'op' },
    ] },

    // ── Running a round
    { name: 'start', group: 'round', who: 'op', when: ['Before a round'], forms: [
        { args: '<minutes> <jokers>', text: 'Starts a round of that length, with that many jokers each.', example: '/start 60 3' },
        { args: '<preset>', text: 'Starts a round from a saved preset of settings.' },
    ] },
    { name: 'settings', group: 'round', who: 'op', forms: [
        { args: '', text: 'Opens the settings menu.' },
    ] },
    { name: 'pause', group: 'round', who: 'event', when: ['During a round'], forms: [
        { args: '', text: 'Freezes every player and the timer.' },
    ] },
    { name: 'resume', group: 'round', who: 'event', when: ['While paused'], forms: [
        { args: '', text: 'Unfreezes them.' },
    ] },
    { name: 'stoptimer', group: 'round', who: 'op', when: ['During a round'], forms: [
        { args: '', text: 'Ends the round now.' },
    ] },
    { name: 'skip', group: 'round', who: 'op', when: ['During a round'], forms: [
        { args: '<player>', text: 'Skips a player\'s current item. In Run Battle, it skips it for everyone.', example: '/skip Steve' },
    ] },
    { name: 'randomevent', group: 'round', who: 'op', when: ['During a round'], forms: [
        { args: '<event>', text: 'Starts a random event now: item_hunt, point_hunt or special_trader.', example: '/randomevent item_hunt' },
    ] },
    { name: 'forceteam', group: 'round', who: 'op', when: ['Before a round', 'With Teams on'], forms: [
        { args: '<team> <player> [player]', text: 'Puts players in a team.', example: '/forceteam blue Steve Alex' },
    ] },
    { name: 'forceitem', group: 'round', who: 'op', when: ['During a round', 'Players in the round'], forms: [
        { args: '<item> [item] …', text: 'Sets your current item and the ones after it. A tool for testing.', example: '/forceitem diamond emerald' },
    ] },
    { name: 'items', group: 'round', who: 'op', forms: [
        { args: '', text: 'Shows every item the pool can hand out.' },
    ] },
    { name: 'reset', group: 'round', who: 'op', forms: [
        { args: '[biome]', text: 'Restarts the server into a new world with a new seed, optionally starting in a given biome. This is also when the worldgen datapack is copied in.' },
    ] },
    { name: 'result', group: 'round', who: 'op', when: ['After a round'], forms: [
        { args: '', text: 'Shows the next player\'s result on the results screen.' },
    ] },
    { name: 'spectate', group: 'round', who: 'all', when: ['After a round'], forms: [
        { args: '', text: 'Takes you out of spectator mode, into creative.' },
    ] },
];

/*
 * Registered by the plugin and left off the page on purpose: operator tooling that
 * players are not meant to read about (see Rules in DESIGN.md). Never rendered.
 */
export const UNLISTED = ['checkmods'];
