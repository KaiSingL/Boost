// Theme handling: respect saved preference or system (light/dark)
const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
const saved = localStorage.getItem('hn-t');
if (saved === 'l' || (!saved && prefersLight)) document.documentElement.classList.add('hn-light');

// Poll until HN loads enough to modify
const iv = setInterval(tryMod, 250);
function tryMod() {
  const top = document.querySelector('td[bgcolor="#ff6600"]');
  if (!top || document.querySelector('.hn-h')) { clearInterval(iv); return; }
  modHeader(top);
  const bodyTd = document.querySelector('body > center > table > tbody > tr:nth-child(3) > td');
  if (!bodyTd) return;
  const tbl = bodyTd.querySelector('table');
  if (tbl) modStories(tbl), modMore(), hideOld();
  clearInterval(iv);
}

// Replace classic orange bar with modern sticky header
function modHeader(td) {
  const auth = td.querySelector('.pagetop')?.innerHTML || '<a href="login">login</a>';
  const light = document.documentElement.classList.contains('hn-light');
  td.innerHTML = `<div class="hn-h"><div class="hn-i"><div class="hn-l"><a href="/"><img src="y18.svg" width=28 height=28></a><a href="/" class="hn-t">Hacker News</a></div><div class="hn-r"><button id="hn-th">${light?'🌙':'☀️'}</button><button class="hn-m">≡</button><div class="hn-d"><ul><li><a href=newest>new</a><li><a href=front>past</a><li><a href=newcomments>comments</a><li><a href=ask>ask</a><li><a href=show>show</a><li><a href=jobs>jobs</a><li><a href=submit>submit</a></ul></div></div></div></div>`;

  // Theme toggle
  document.getElementById('hn-th').addEventListener('click',()=> {
    document.documentElement.classList.toggle('hn-light');
    const isL = document.documentElement.classList.contains('hn-light');
    document.getElementById('hn-th').textContent = isL?'🌙':'☀️';
    localStorage.setItem('hn-t',isL?'l':'d');
  });

  // Mobile menu
  const btn = td.querySelector('.hn-m'), menu = td.querySelector('.hn-d');
  btn.addEventListener('click',e=>{menu.classList.toggle('o');e.stopPropagation();});
  document.addEventListener('click',()=>menu.classList.remove('o'));
}

// Convert table rows into card grid
function modStories(tbl) {
  const grid = document.createElement('div'); grid.className='hn-g';
  tbl.querySelectorAll('tr.athing').forEach(tr=>{
    const sub = tr.nextElementSibling?.querySelector('.subtext'); if(!sub) return;
    const rank = tr.querySelector('.rank')?.textContent||'';
    const a = tr.querySelector('.titleline>a');
    const title = a?.textContent||'', url = a?.href||'#';
    const dom = tr.querySelector('.sitestr')?`(${tr.querySelector('.sitestr').textContent})`:'';
    const score = sub.querySelector('.score')?.textContent||'0 points';
    const user = sub.querySelector('.hnuser')?.textContent||'';
    const age = sub.querySelector('.age>a')?.textContent||'now';
    const vote = tr.querySelector('a[id^="up_"]')?.outerHTML||'';
    const hide = sub.querySelector('a[href^="hide"]') ? '|'+sub.querySelector('a[href^="hide"]').outerHTML : '';
    const comA = sub.querySelector('a[href^="item?id="]:last-of-type');
    const comHref = comA?.href || `item?id=${tr.id}`;
    const comTxt = (comA?.textContent||'discuss').replace(/\u00a0/g,' ');

    const card = document.createElement('article');
    card.className='hn-c';
    card.innerHTML = `<div class="hn-rk">${rank}</div><div class="hn-mn"><h2 class="hn-tt"><a href="${url}">${title}</a><span class="hn-dm">${dom}</span></h2><div class="hn-mt">${vote}<span>${score}</span> by <a href="user?id=${user}">${user}</a> <span>${age} ago</span> ${hide} | <a href="${comHref}">${comTxt}</a></div></div>`;
    grid.appendChild(card);
  });
  if(grid.children.length) tbl.replaceWith(grid);
}

// Replace "More" link with styled button
function modMore() {
  const a = document.querySelector('a[href^="news?p="],a[href^="x?fnid="]');
  if(a && !a.closest('.hn-mb')) a.outerHTML = `<div class="hn-mb"><a href="${a.href}">More →</a></div>`;
}

// Hide classic spacers/footer junk
function hideOld() {
  document.querySelectorAll('.yclinks,form[action*="algolia"],img[src="s.gif"],tr[height="5"],td.title').forEach(el=>el.style.display='none');
}