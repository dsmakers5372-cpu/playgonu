// Click-to-play YouTube: the page shows only the video's thumbnail until
// someone presses play, so visitors who don't watch never load YouTube's
// player or cookies. The player itself comes from youtube-nocookie.com.
export function mountVideoFacades(root = document) {
  for (const box of root.querySelectorAll('.pg-video[data-youtube]')) {
    const button = box.querySelector('.pg-video__play');
    if (!button || box.dataset.mounted) continue;
    box.dataset.mounted = '1';
    button.addEventListener('click', () => {
      const id = box.dataset.youtube;
      if (!/^[\w-]{11}$/.test(id)) return;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
      iframe.title = box.dataset.title || 'YouTube video';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      box.replaceChildren(iframe);
    });
  }
}
