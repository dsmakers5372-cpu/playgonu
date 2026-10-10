const MESSAGE = {
  en: 'The game in progress will be lost. Start a new game?',
  ko: '진행 중인 판이 사라집니다. 새 판을 시작할까요?',
  es: 'Se perderá la partida en curso. ¿Empezar una nueva?',
  ja: '進行中の対局は失われます。新しい対局を始めますか？',
  zh: '正在进行的对局将会丢失。要开始新对局吗？',
};

// A select whose change restarts the game: ask first when a game is under
// way, and put the old value back if the player says no.
export function guardedSelect(select, { lang, inProgress, onConfirmed }) {
  let last = select.value;
  select.addEventListener('change', () => {
    if (inProgress() && !window.confirm(MESSAGE[lang] || MESSAGE.en)) {
      select.value = last;
      return;
    }
    last = select.value;
    onConfirmed();
  });
}
