/**
 * Every page of the site, named in plain words, with the item that stands for it.
 *
 * One list, because the home page's "Where next" and each inner page's own "Where
 * next" name the same places and must say the same thing about them. The faces
 * match the nav's (Navigation.jsx keeps its own copy of the faces only, because it
 * ships in the entry chunk and must not pull this module or the atlas behind it).
 */

export const PAGES = [
    { id: 'how-to-play', name: 'How to Play', face: 'CRAFTING_TABLE', text: 'Join our server, or host a round yourself with the plugin, pack and datapack.' },
    { id: 'gameplay', name: 'Gameplay', face: 'COMPASS', text: 'The loop, the three modes, the pool stages and strategy.' },
    { id: 'pools', name: 'Item Pools', face: 'CHEST', text: 'Every item the game can hand you, by stage and tag.' },
    { id: 'structures', name: 'Custom Content', face: 'STRUCTURE_BLOCK', text: 'The structures and items built for this edition.' },
    { id: 'commands', name: 'Commands', face: 'COMMAND_BLOCK', text: 'Every command, what it does and who can use it.' },
    { id: 'settings', name: 'Game Settings', face: 'COMPARATOR', text: 'What each round setting changes.' },
    { id: 'rules', name: 'Rules', face: 'WRITABLE_BOOK', text: 'How to play fair here, and which mods are not allowed.' },
    { id: 'changelog', name: 'Changelog', face: 'BOOK', text: 'Every release, newest first.' },
    { id: 'stats', name: 'Stats', face: 'SPYGLASS', text: 'Players, matches, achievements and rankings, live from the server.', exit: true },
    { id: 'wheel', name: 'Wheel of Fortune', src: '/fib-custom/wheel.png', text: 'Spin for items and fill your collection book.', exit: true },
];

export const PAGE = Object.fromEntries(PAGES.map((p) => [p.id, p]));

/** An in-app link that is still a real link: middle-click and copy work. */
export function useGo(onNavigate) {
    return (id) => (e) => {
        if (!onNavigate || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        onNavigate(id);
    };
}
