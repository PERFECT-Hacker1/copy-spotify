let currentSong = new Audio();
let songs;
let currfolder;

// IndexedDB setup
let db;
const request = indexedDB.open("MusicApp", 1);
request.onupgradeneeded = function (e) {
  db = e.target.result;
  if (!db.objectStoreNames.contains("downloads")) {
    db.createObjectStore("downloads", { keyPath: "file" });
  }
};
request.onsuccess = function (e) {
  db = e.target.result;
};

function convertSecondsToMinutesSeconds(totalSeconds) {
  if (typeof totalSeconds !== 'number' || totalSeconds < 0 || isNaN(totalSeconds)) {
    return "00:00";
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

async function getSongs(folder) {
  currfolder = folder;
  let a = await fetch(`http://localhost:7700/${folder}/`);
  let response = await a.text();
  let div = document.createElement("div");
  div.innerHTML = response;
  let as = div.getElementsByTagName("a");
  songs = [];
  for (let element of as) {
    if (element.href.endsWith(".mp3")) {
      songs.push(element.href.split(`/${folder}/`)[1]);
    }
  }
  let songUL = document.querySelector(".songList ul");
  songUL.innerHTML = "";
  for (let song of songs) {
    songUL.innerHTML += `
      <li>
        <img class="invert" src="image/song.png">
        <div class="info">
          <div>${song}</div>
          <div></div>
        </div>
      </li>`;
  }
  Array.from(document.querySelector(".songList li")).forEach(e => {
    e.addEventListener("click", () => {
      playMusic(e.querySelector(".info").firstElementChild.innerHTML.trim());
    });
  });
  return songs;
}

function downloadAndSave(track) {
  fetch(currentSong.src)
    .then(res => res.blob())
    .then(blob => {
      const transaction = db.transaction(["downloads"], "readwrite");
      const store = transaction.objectStore("downloads");
      store.put({ file: track, blob: blob });
      alert(`✅ "${track}" saved to Downloads`);
    });
}

const playMusic = (track, pause = false) => {
  currentSong.src = `/${currfolder}/` + track;

  // Set download button action
  const downloadIcon = document.querySelector("#downloadSong");
  if (downloadIcon) {
    downloadIcon.onclick = () => downloadAndSave(track);
  }

  if (!pause) {
    currentSong.play();
    play.src = "pause.svg";
  }
  document.querySelector(".songinfo").innerHTML = track;
  document.querySelector(".songtime").innerHTML = "00:00/00:00";
};

async function displayAlbums() {
  let a = await fetch(`/songs/`);
  let response = await a.text();
  let div = document.createElement("div");
  div.innerHTML = response;
  let anchors = div.getElementsByTagName("a");
  let cardContainer = document.querySelector(".card-container");
  let array = Array.from(anchors);
  for (let e of array) {
    if (e.href.includes("/songs")) {
      let folder = e.href.split("/").splice(-2)[0];
      let a = await fetch(`http://localhost:7700/songs/${folder}/info.json`);
      let res = await a.json();
      cardContainer.innerHTML += `
        <div data-folder="${folder}" class="card">
          <div class="play"><img src="image/play.png"></div>
          <img src="/songs/${folder}/cover.jpg" alt="playlist">
          <h2>${res.title}</h2>
          <p>${res.description}</p>
        </div>`;
    }
  }
  Array.from(document.getElementsByClassName("card")).forEach(e => {
    e.addEventListener("click", async item => {
      songs = await getSongs(`songs/${item.currentTarget.dataset.folder}`);
      playMusic(songs[0]);
    });
  });
}

async function main() {
  await getSongs("songs/ncs");
  playMusic(songs[0], true);
  displayAlbums();

  // Play/Pause button
  play.addEventListener("click", () => {
    if (currentSong.paused) {
      currentSong.play();
      play.src = "pause.svg";
    } else {
      currentSong.pause();
      play.src = "image/play.png";
    }
  });

  // Time update always active
  currentSong.addEventListener("timeupdate", () => {
    document.querySelector(".songtime").innerHTML =
      `${convertSecondsToMinutesSeconds(currentSong.currentTime)}/${convertSecondsToMinutesSeconds(currentSong.duration)}`;
    document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
  });

  // Auto play next song when current ends
  currentSong.addEventListener("ended", () => {
    let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
    if ((index + 1) < songs.length) {
      playMusic(songs[index + 1]);
    }
  });

  // Seekbar click
  document.querySelector(".seekbar").addEventListener("click", e => {
    let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
    document.querySelector(".circle").style.left = percent + "%";
    currentSong.currentTime = (currentSong.duration * percent) / 100;
  });

  // Previous/Next buttons
  previous.addEventListener("click", () => {
    let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
    if ((index - 1) >= 0) {
      playMusic(songs[index - 1]);
    }
  });
  next.addEventListener("click", () => {
    let index = songs.indexOf(currentSong.src.split("/").slice(-1)[0]);
    if ((index + 1) < songs.length) {
      playMusic(songs[index + 1]);
    }
  });

  // Show Downloaded Songs
  document.getElementById("showDownloaded").addEventListener("click", () => {
    const transaction = db.transaction(["downloads"], "readonly");
    const store = transaction.objectStore("downloads");
    const request = store.getAll();
    request.onsuccess = function (e) {
      const songsData = e.target.result;
      const songUL = document.querySelector(".songList ul");
      songUL.innerHTML = "";
      songsData.forEach(songObj => {
        songUL.innerHTML += `
          <li style="cursor:pointer;">
            <img class="invert" src="image/song.png">
            <div class="info">
              <div>${songObj.file}</div>
              <div>Downloaded</div>
            </div>
          </li>`;
      });
      Array.from(songUL.getElementsByTagName("li")).forEach((li, i) => {
        li.addEventListener("click", () => {
          const blobURL = URL.createObjectURL(songsData[i].blob);
          currentSong.src = blobURL;
          currentSong.play();
          play.src = "pause.svg";
          document.querySelector(".songinfo").innerHTML = songsData[i].file;
        });
      });
    };
  });
}

// Search Functionality remains same (you can keep your old searchSongAllPlaylists code here)

main();

// Sidebar logic same as before
const openSidebar = document.getElementById('openSidebar');
const closeSidebar = document.getElementById('closeSidebar');
const sidebar = document.querySelector('.left');
const overlay = document.getElementById('sidebar-overlay');

if (openSidebar && sidebar && overlay) {
  openSidebar.onclick = () => {
    sidebar.classList.add('open');
    overlay.classList.add('active');
  };
}
if (closeSidebar && sidebar && overlay) {
  closeSidebar.onclick = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  };
}
if (overlay && sidebar) {
  overlay.onclick = () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
  };
}