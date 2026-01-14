const supportUrl =
  (window.SpotmatePublic && window.SpotmatePublic.supportUrl) || "/support";
const tasksBaseUrl =
  (window.SpotmatePublic && window.SpotmatePublic.archiveTasksBase) || "/tasks";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const escapeHtml = (value = "") =>
  String(value ?? "").replace(/[&<>"']/g, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character]
  );

const attributeEscape = (value = "") =>
  String(value ?? "").replace(/"/g, "&quot;");

function showSupportError(message) {
  const container = document.querySelector("#error-text");
  if (container) {
    const safe = escapeHtml(message || "Something went wrong.");
    container.innerHTML = `${safe}<br><small>Need faster downloads and unlimited ZIPs? <a href="${supportUrl}" target="_blank" rel="noopener">Support SpotMate</a>.</small>`;
  }
  const wrapper = document.querySelector("#error");
  if (wrapper) {
    wrapper.style.display = "block";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  //     if ("serviceWorker" in navigator) {
  //   navigator.serviceWorker.register("/sw.js").then(
  //     (registration) => {
  //       console.log("Service worker registration succeeded:", registration);
  //     },
  //     (error) => {
  //       console.error(`Service worker registration failed: ${error}`);
  //     }
  //   );
  // } else {
  //   console.error("Service workers are not supported.");
  // }
  document
    .getElementById("spotifyForm")
    .addEventListener("submit", function (e) {
      e.preventDefault();
      document.getElementById("trackData").style.display = "none";
      document.querySelector("#error").style.display = "none";
      let btn = document.getElementById('btnSubmit');
      let loading = document.getElementById('loading');
      loading.style.display = "block";
      btn.disabled = true;
      var trackUrl = document.getElementById("trackUrl").value;
      const csrf = document.querySelector('meta[name="csrf-token"]').content;
      if (trackUrl.includes("spotify")) {

        fetch("/getTrackData", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-CSRF-TOKEN": csrf,
          },
          body: JSON.stringify({
            spotify_url: trackUrl,
          }),
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.type == "track") {
              document.getElementById("header").style.display = "none";
              let trackData = data;
              displayTrackInfo(trackData);
            } else if (data.type == "album") {
              document.getElementById("header").style.display = "none";
              let albumData = data;
              displayAlbumInfo(albumData);
            } else if (data.type == "playlist") {
              document.getElementById("header").style.display = "none";
              let playlistData = data;
              displayPlaylist(playlistData);
            } else if (data.tracks) {
              document.getElementById("header").style.display = "none";
              let playlistData = data;
              displayArtistInfo(playlistData);
            } else {
              showSupportError(data.status || 'Unable to process that URL right now.');
              loading.style.display = "none";
              btn.disabled = false;
            }
          })
          .catch((error) => {
            console.error("Error:", error);
          });
      } else {
        showSupportError('Invalid Url');
        loading.style.display = "none";
        btn.disabled = false;
      }
    });
  document
    .querySelector("#trackData")
    .addEventListener("click", function (e) {
      // Check if the id is empty or the button is disabled
      if (!e.target.id || e.target.disabled) {
        return; // Do nothing if the id is empty or the button is disabled
      }
      let id = e.target.id;
      let val = document.querySelector(`input[name="${id}"]`).value;
      let result = document.getElementsByClassName(id).item(0);
      const buttons = Array.from(document.querySelectorAll('.btn-success'));
      const disableAll = () => buttons.forEach(button => { button.disabled = true; });
      const enableAll = () => buttons.forEach(button => { button.disabled = false; });
      const showDownloadButton = (url) => {
        enableAll();
        result.innerHTML = "";
        result.classList.add('text-end');
        result.appendChild(callBack(url));
      };
      const showFailureState = (message) => {
        enableAll();
        result.innerHTML = "";
        result.classList.add('text-end');
        if (message) {
          showSupportError(message);
        }
        result.appendChild(callbackfail(window.location.href));
      };

      disableAll();
      result.innerHTML = "";
      result.classList.remove('text-end');
      const loaderNode = loader(id);
      const progressBar = loaderNode.querySelector('.progress-bar');
      result.appendChild(loaderNode);
      let Url = "/convert";
      const csrf = document.querySelector('meta[name="csrf-token"]').content;
      fetch(Url, {
        method: 'POST', // or 'GET' depending on your API
        headers: {
          'Content-Type': 'application/json', // Adjust the content type if needed
          "X-CSRF-TOKEN": csrf,
        },
        body: JSON.stringify({ urls: val }),

      })
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json(); // This line will throw the error if the response is empty
        })
        .then(data => {
          const taskId = data.task_id || data.taskId;
          if (data.error === false && data.url) {
            showDownloadButton(data.url);
            return;
          }

          if (taskId) {
            if (progressBar) {
              updateInlineProgressBar(progressBar, 5);
            }
            pollGuestConversionTask(taskId, {
              progressBar,
              onSuccess: (url) => {
                showDownloadButton(url);
              },
              onFailure: (message) => {
                showFailureState(message);
              },
            });
            return;
          }

          const message = data.status || data.message || data.data || 'Unable to convert this track right now.';
          showFailureState(message);
        })
        .catch(error => {
          console.error('Error:', error);
          showFailureState('Unable to convert this track right now. Please try again.');
        });
    });
});
function geturldata(e) {
  document.getElementById("trackData").style.display = "none";
  document.querySelector("#error").style.display = "none";
  let btn = document.getElementById('btnSubmit');
  let loading = document.getElementById('loading');
  loading.style.display = "block";
  btn.disabled = true;
  var trackUrl = document.getElementById("trackUrl").value;
  const csrf = document.querySelector('meta[name="csrf-token"]').content;
  if (trackUrl.includes("spotify.com")) {

    fetch("/getTrackData", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrf,
      },
      body: JSON.stringify({
        spotify_url: trackUrl,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.type == "track") {
          document.getElementById("header").style.display = "none";
          let trackData = data;
          displayTrackInfo(trackData);
        } else if (data.type == "album") {
          document.getElementById("header").style.display = "none";
          let albumData = data;
          displayAlbumInfo(albumData);
        } else if (data.type == "playlist") {
          document.getElementById("header").style.display = "none";
          let playlistData = data;
          displayPlaylist(playlistData);
        } else if (data.tracks) {
          document.getElementById("header").style.display = "none";
          let playlistData = data;
          displayArtistInfo(playlistData);
        } else {
          showSupportError(data.status || 'Unable to process that URL right now.');
          loading.style.display = "none";
          btn.disabled = false;
        }
      })
      .catch((error) => {
        console.error("Error:", error);
      });
  } else {
    showSupportError('Invalid Url');
    loading.style.display = "none";
    btn.disabled = false;
  }
}
function displayPlaylist(playlistData) {
  const playlistName = playlistData.name;
  const playlistOwner = playlistData.owner.display_name;
  const playlistImage = playlistData.images[0].url;
  const rawTracks = playlistData.tracks.items || [];

  const normalizedTracks = rawTracks
    .map((entry, index) => {
      const track = entry.track;
      if (!track || !track.id || !track.external_urls?.spotify) {
        return null;
      }
      const artists = (track.artists || [])
        .map((artist) => artist.name)
        .join(", ");
      return {
        id: track.id,
        url: track.external_urls.spotify,
        name: track.name,
        artists,
        position: index + 1,
      };
    })
    .filter(Boolean);

  const showArchiveHelper = normalizedTracks.length >= 10;

  const trackRows = normalizedTracks
    .map(
      (track) => `
      <div class="row align-items-center border-bottom track-row" data-track-id="${track.id}" data-track-name="${attributeEscape(track.name)}" data-track-artists="${attributeEscape(track.artists)}" data-track-url="${track.url}">
        <div class="col-6 col-sm-7">
          <span class="row align-items-center">
            <p class="col-1">${track.position}</p>
            <div class="col-10">
              <p class="text-new mb-1 text-start">${track.name}</p>
              <p class="p-0 ms-2 text-start">${track.artists}</p>
            </div>
          </span>
        </div>
        <div class="${track.id} col-6 col-sm-5 text-end" data-convert-column="true">
          <input name="${track.id}" value="${track.url}" type="hidden">
          <button id="${track.id}" class="btn btn-success"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-arrow-repeat me-1" viewBox="0 0 16 16">
  <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9"/>
  <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5 5 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z"/>
</svg>Convert</button>
        </div>
      </div>`
    )
    .join("");

  const playlistInfoContainer = document.getElementById("trackData");
  playlistInfoContainer.innerHTML = `
    <div class="text-center">
      <img style="width: 150px; height: 150px !important; object-fit: contain; background: linear-gradient(to bottom right, #1ED760, #000000, #059669);" src="${playlistImage}" alt="Cover of ${playlistName} by ${playlistOwner}" class="img-thumbnail rounded-4">
      <p class="text-new fs-6 fw-bold mt-1 mb-1">${playlistOwner}</p>
    </div>
    ${showArchiveHelper ? archiveHelperTemplate() : ""}
    <div id="tracks">
      ${trackRows}
      <div class="d-flex justify-content-center flex-wrap gap-2 mt-2">
        <a href="/" class="btn btn-new text-white">Download Another Playlist</a>
        <a href="https://www.tunecable.com/spotify-flac-downloader.html" target="_blank" rel="nofollow noopener" class="btn btn-warning fw-semibold text-dark position-relative overflow-hidden" style="padding-top: 12px">Download FLAC </a>
      </div>
    </div>
  `;

  document.getElementById("trackData").style.display = "block";
  if (showArchiveHelper) {
    initializeArchiveHelper(playlistInfoContainer, {
      sourceUrl: playlistData.external_urls?.spotify || playlistData.href || "",
      label: `${playlistName} Mini ZIP`,
    });
  }
  showPremiumPromo(showArchiveHelper);
}
// Example function to display track information
function displayTrackInfo(trackData) {
  // Extract relevant information from the track data
  const trackName = trackData.name;
  const trackArtists = trackData.artists
    .map((artist) => artist.name)
    .join(", ");
  // Add other relevant information you want to display

  // Display track information on the frontend
  const trackInfoContainer = document.getElementById("trackData");
  trackInfoContainer.innerHTML = `
<div class="text-center">
<img style="width: 150px; height: 150px !important; object-fit: contain; background: linear-gradient(to bottom right, #1ED760, #000000, #059669);" src="${trackData.album.images[0].url}" alt="Cover of ${trackName} by ${trackArtists}" class="img-thumbnail rounded-4">
<p class="text-new fs-6 fw-bold mt-1 mb-1">${trackArtists}</p>
</div>
<div id="tracks">
<div class="row align-items-center border-bottom"> <span class="col-6 col-sm-7"><p class="text-new mb-1 text-start">${trackName} </p><p class="p-0 ms-2 text-start"> ${trackArtists}</p></span> <span class="${trackData.id} col-6 col-sm-5 text-end"><input name="${trackData.id}" value="${trackData.external_urls.spotify}" type="hidden"> <button id="${trackData.id}" class="btn btn-success"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-arrow-repeat me-1" viewBox="0 0 16 16">
  <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9"/>
  <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5 5 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z"/>
</svg>Convert</button></span> </div>
<div class="d-flex justify-content-center flex-wrap gap-2 mt-2">
<a href="/" class="btn btn-new text-white">Download Another Song</a>
<a href="https://www.tunecable.com/spotify-flac-downloader.html" target="_blank" rel="nofollow noopener" class="btn btn-warning fw-semibold text-dark position-relative overflow-hidden" style="padding-top: 12px">Download FLAC <span class="position-absolute top-0 end-0 px-1 text-muted" style="font-size: 0.5rem; background: rgba(255, 255, 255, 0.4); border-bottom-left-radius: 4px; line-height: 1.2;">Sponsored</span></a>
</div>
</div>
`;
  document.getElementById("trackData").style.display = "block";
  showPremiumPromo(false);
}

// Example function to display album information
function displayAlbumInfo(albumData) {
  // Extract relevant information from the album data
  const albumName = albumData.name;
  const albumArtists = albumData.artists
    .map((artist) => artist.name)
    .join(", ");
  const tracks = albumData.tracks.items || [];

  const normalizedTracks = tracks
    .map((track, index) => {
      if (!track || !track.id || !track.external_urls?.spotify) {
        return null;
      }

      const artists = (track.artists || [])
        .map((artist) => artist.name)
        .join(", ");

      return {
        id: track.id,
        url: track.external_urls.spotify,
        name: track.name,
        artists,
        position: index + 1,
      };
    })
    .filter(Boolean);

  const showArchiveHelper = normalizedTracks.length >= 10;

  const trackRows = normalizedTracks
    .map(
      (track) => `
      <div class="row align-items-center border-bottom track-row" data-track-id="${track.id}" data-track-name="${attributeEscape(track.name)}" data-track-artists="${attributeEscape(track.artists)}" data-track-url="${track.url}">
        <div class="col-6 col-sm-7">
          <span class="row align-items-center">
            <p class="col-1">${track.position}</p>
            <div class="col-10">
              <p class="text-new mb-1 text-start">${track.name}</p>
              <p class="p-0 ms-2 text-start">${track.artists}</p>
            </div>
          </span>
        </div>
        <div class="${track.id} col-6 col-sm-5 text-end" data-convert-column="true">
          <input name="${track.id}" value="${track.url}" type="hidden">
          <button id="${track.id}" class="btn btn-success"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-arrow-repeat me-1" viewBox="0 0 16 16">
  <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9"/>
  <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5 5 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z"/>
</svg>Convert</button>
        </div>
      </div>`
    )
    .join("");

  const albumInfoContainer = document.getElementById("trackData");
  albumInfoContainer.innerHTML = `
        <div class="text-center">
            <img style="width: 150px; height: 150px !important; object-fit: contain; background: linear-gradient(to bottom right, #1ED760, #000000, #059669);" src="${albumData.images[0].url}" alt="Cover of ${albumName} by ${albumArtists}" class="img-thumbnail rounded-4">
            <p class="text-new fs-6 fw-bold mt-1 mb-1">${albumArtists}</p>
        </div>
        ${showArchiveHelper ? archiveHelperTemplate() : ""}
        <div id="tracks">
            ${trackRows}
            <div class="d-flex justify-content-center flex-wrap gap-2 mt-2">
                <a href="/" class="btn btn-new text-white">Download Another Album</a>
                <a href="https://www.tunecable.com/spotify-flac-downloader.html" target="_blank" rel="nofollow noopener" class="btn btn-warning fw-semibold text-dark position-relative overflow-hidden" style="padding-top: 12px">Download FLAC </a>
            </div>
        </div>
    `;
  document.getElementById("trackData").style.display = "block";
  if (showArchiveHelper) {
    initializeArchiveHelper(albumInfoContainer, {
      sourceUrl: albumData.external_urls?.spotify || albumData.href || "",
      label: `${albumName} Mini ZIP`,
    });
  }
  showPremiumPromo(showArchiveHelper);
}
function displayArtistInfo(albumData) {
  // Extract relevant information from the album data
  const albumName = albumData.tracks[0].album.name;
  const albumArtists = albumData.tracks[0].artists
    .map((artist) => artist.name)
    .join(", ");
  // const albumImage = albumData.tracks[0].album.images[0].url;
  const tracks = albumData.tracks || [];

  const normalizedTracks = tracks
    .map((track, index) => {
      if (!track || !track.id || !track.external_urls?.spotify) {
        return null;
      }

      const artists = (track.artists || [])
        .map((artist) => artist.name)
        .join(", ");

      const artwork =
        track.album?.images?.[2]?.url ||
        track.album?.images?.[0]?.url ||
        "";

      return {
        id: track.id,
        url: track.external_urls.spotify,
        name: track.name,
        artists,
        artwork,
        position: index + 1,
      };
    })
    .filter(Boolean);

  const showArchiveHelper = normalizedTracks.length >= 10;

  const trackRows = normalizedTracks
    .map(
      (track) => `
        <div class="row align-items-center my-2 border-bottom track-row" data-track-id="${track.id}" data-track-name="${attributeEscape(track.name)}" data-track-artists="${attributeEscape(track.artists)}" data-track-url="${track.url}">
          <div class="col-8">
            <span class="row align-items-center">
              <div class="col-5 d-flex">
                <img src="${track.artwork}" alt="Cover of ${track.name} by ${track.artists}">
              </div>
              <div class="col-7">
                <p class="text-new mb-1 text-start">${track.name}</p>
                <p class="text-muted small mb-0 text-start">${track.artists}</p>
              </div>
            </span>
          </div>
          <div class="${track.id} col-4 text-end" data-convert-column="true">
            <input name="${track.id}" value="${track.url}" type="hidden">
            <button id="${track.id}" class="btn btn-success"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-arrow-repeat me-1" viewBox="0 0 16 16">
  <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41m-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9"/>
  <path fill-rule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5 5 0 0 0 8 3M3.1 9a5.002 5.002 0 0 0 8.757 2.182.5.5 0 1 1 .771.636A6.002 6.002 0 0 1 2.083 9z"/>
</svg>Convert</button>
          </div>
        </div>`
    )
    .join("");

  const albumInfoContainer = document.getElementById("trackData");
  albumInfoContainer.innerHTML = `
      <div class="text-center">
          <p class="fs-6 fw-bold mt-1 mb-2">Popular Tracks</p>
  </div>
      ${showArchiveHelper ? archiveHelperTemplate() : ""}
        <div id="tracks">
          ${trackRows}
        <div class="d-flex justify-content-center flex-wrap gap-2 mt-2">
          <a href="/" class="btn btn-new text-white">Download Another Artist</a>
          <a href="https://www.tunecable.com/spotify-flac-downloader.html" target="_blank" rel="nofollow noopener" class="btn btn-warning fw-semibold text-dark position-relative overflow-hidden" style="padding-top: 12px">Download FLAC </a>
        </div>
        </div>
      `;

  document.getElementById("trackData").style.display = "block";
  const artistUrl =
    albumData.tracks[0]?.artists?.[0]?.external_urls?.spotify || "";
  if (showArchiveHelper) {
    initializeArchiveHelper(albumInfoContainer, {
      sourceUrl: artistUrl,
      label: `${albumArtists} Mini ZIP`,
    });
  }
  showPremiumPromo(showArchiveHelper);
}

function showPremiumPromo(shouldShowModal = false) {
  // Hide TuneCable Ad
  const tuneCable = document.getElementById('tunecable-section');
  if (tuneCable) tuneCable.style.display = 'none';

  // Show Result Banner
  const banner = document.getElementById('result-banner');
  if (banner) banner.style.display = 'block';

  if (shouldShowModal) {
    // Show Modal
    setTimeout(() => {
      try {
        const modalEl = document.getElementById('premiumModal');
        if (modalEl) {
          // Check if bootstrap is available
          if (typeof bootstrap !== 'undefined') {
            const modal = new bootstrap.Modal(modalEl); // Create new instance
            modal.show();
          } else {
            // Fallback
            const myModal = new bootstrap.Modal(modalEl);
            myModal.show();
          }

          // Timer Logic
          const btn = document.getElementById('continueFreeBtn');
          const timerText = document.getElementById('timerText');
          if (btn && timerText) {
            // Reset state
            btn.disabled = true;
            let seconds = 6;
            timerText.textContent = `(${seconds}s)`;

            // Clear any existing interval to prevent duplicates if function called multiple times
            if (window.premiumTimerInterval) clearInterval(window.premiumTimerInterval);

            window.premiumTimerInterval = setInterval(() => {
              seconds--;
              if (seconds > 0) {
                timerText.textContent = `(${seconds}s)`;
              } else {
                clearInterval(window.premiumTimerInterval);
                timerText.textContent = '';
                btn.disabled = false;
              }
            }, 1000);
          }
        }
      } catch (e) {
        console.error("Error showing premium promo:", e);
      }
    }, 4500);
  }
}

function archiveHelperTemplate() {
  return `
    <div class="archive-mini card border-0 shadow mt-4 d-none" id="archive-helper">
      <div class="card-body p-4">
        <div class="d-flex flex-column flex-lg-row gap-4 align-items-lg-center">
          <div class="d-flex align-items-start gap-3 flex-grow-1 w-100">
            <span class="archive-mini__icon rounded-4">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 30" aria-hidden="true">
                <path d="M19 2h-8a3 3 0 0 0-3 3v20a3 3 0 0 0 3 3h10l5-5V5a3 3 0 0 0-3-3h-2" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M23 23h5l-5 5v-5Z" fill="currentColor" />
                <path d="M12 7h6M12 11h6M12 15h3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </span>
            <div class="w-100">
              <div class="archive-mini__meta d-flex flex-wrap align-items-center gap-2 mb-2">
                <span class="badge rounded-pill text-uppercase archive-mini__badge">Free mini ZIP</span>
                <span class="archive-mini__count text-uppercase small fw-semibold">Selected: <span id="archive-selected-count">0 / 0</span></span>
              </div>
              <h5 class="mb-2">Bundle any 3 songs into a quick download</h5>
              <p class="text-muted small mb-0">
                Choose your favorite trio and we'll wrap them into a ZIP. Want unlimited playlist ZIPs, FLAC, and lightning-fast downloads?
                <a href="${supportUrl}" target="_blank" rel="noopener">Support SpotMate</a> to unlock premium power features.
              </p>
            </div>
          </div>
          <div class="archive-mini__cta text-start text-lg-end">
            <p class="small mb-2" id="archive-limit-message"></p>
            <div class="archive-mini__steps mb-3">
              <p class="small text-uppercase text-muted mb-1">Mini ZIP progress</p>
              <ul class="list-unstyled small mb-0" id="archive-steps"></ul>
            </div>
            <p class="small text-info mb-3" id="archive-status-text"></p>
            <button class="btn archive-mini__btn archive-mini__btn--build px-4" id="archive-submit" data-idle-label="Build free mini ZIP">
              Build free mini ZIP
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

const archiveHelperModule = (() => {
  const state = {
    max: 3,
    maxSelectable: 0,
    tracks: [],
    selected: [],
    selectedTracks: [],
    sourceUrl: "",
    label: "",
    elements: {},
    submitIdleLabel: "Build free mini ZIP",
    downloadUrl: null,
    isBusy: false,
    statusEntries: {
      tracks: [],
      archive: null,
    },
  };

  function reset() {
    state.tracks = [];
    state.selected = [];
    state.selectedTracks = [];
    state.sourceUrl = "";
    state.label = "";
    state.elements = {};
    state.maxSelectable = 0;
    state.submitIdleLabel = "Build free mini ZIP";
    state.downloadUrl = null;
    state.isBusy = false;
    state.statusEntries = {
      tracks: [],
      archive: null,
    };
  }

  function init(context, meta = {}) {
    reset();

    if (!context) {
      return;
    }

    const helper = context.querySelector("#archive-helper");
    if (!helper) {
      return;
    }

    const rows = Array.from(context.querySelectorAll(".track-row"));
    state.tracks = rows
      .map((row) => ({
        id: row.getAttribute("data-track-id"),
        name: row.getAttribute("data-track-name"),
        artists: row.getAttribute("data-track-artists"),
        url: row.getAttribute("data-track-url"),
      }))
      .filter((track) => track.id && track.url);

    if (state.tracks.length < 10) {
      helper.classList.add("d-none");
      return;
    }

    state.sourceUrl = meta.sourceUrl || "";
    state.label = meta.label || "SpotMate Mini ZIP";
    state.maxSelectable = Math.min(state.max, state.tracks.length);
    state.selectedTracks = state.tracks.slice(0, state.maxSelectable);
    state.selected = state.selectedTracks.map((track) => track.id);

    state.elements = {
      helper,
      count: helper.querySelector("#archive-selected-count"),
      limit: helper.querySelector("#archive-limit-message"),
      status: helper.querySelector("#archive-status-text"),
      submit: helper.querySelector("#archive-submit"),
      stepsList: helper.querySelector("#archive-steps"),
    };
    state.submitIdleLabel =
      state.elements.submit?.dataset?.idleLabel ||
      state.elements.submit?.textContent?.trim() ||
      "Build free mini ZIP";

    helper.classList.remove("d-none");
    updateCounter();
    renderStatusEntries();
    setDownloadReady(null);
    setSubmitBusy(false);

    if (state.elements.submit) {
      state.elements.submit.addEventListener("click", handleSubmit);
    }
  }

  function updateCounter(message = "") {
    if (state.elements.count) {
      state.elements.count.textContent = `${state.selected.length} / ${state.maxSelectable}`;
    }

    if (state.elements.limit) {
      if (message) {
        state.elements.limit.innerHTML = message;
      } else if (state.selectedTracks.length > 0) {
        state.elements.limit.innerHTML = `We automatically prepare the first ${state.selectedTracks.length} track${state.selectedTracks.length === 1 ? "" : "s"} from this list.`;
      } else {
        state.elements.limit.innerHTML = "No tracks available for this collection.";
      }
    }
  }

  function setStatus(message, tone = "muted") {
    if (!state.elements.status) {
      return;
    }

    state.elements.status.className = `small text-${tone}`;
    state.elements.status.textContent = message;
  }

  function renderStatusEntries() {
    if (!state.elements.stepsList) {
      return;
    }

    state.elements.stepsList.innerHTML = "";
    state.statusEntries.tracks = [];

    state.selectedTracks.forEach((track, index) => {
      const trackName = track.name || `Track ${index + 1}`;
      const li = document.createElement("li");
      li.dataset.trackId = track.id;
      li.className = "text-muted";
      li.textContent = `Track ${index + 1}: ${trackName} — waiting to convert`;
      state.elements.stepsList.appendChild(li);
      state.statusEntries.tracks.push({
        id: track.id,
        element: li,
        position: index + 1,
        name: trackName,
      });
    });

    const archiveLi = document.createElement("li");
    archiveLi.dataset.step = "archive";
    archiveLi.className = "text-muted";
    archiveLi.textContent = "Archive: waiting for conversions";
    state.elements.stepsList.appendChild(archiveLi);
    state.statusEntries.archive = archiveLi;
  }

  function setTrackStatusMessage(trackId, message, tone = "muted") {
    const entry = state.statusEntries.tracks.find((item) => item.id === trackId);
    if (!entry || !entry.element) {
      return;
    }

    entry.element.className = `text-${tone}`;
    entry.element.textContent = message;
  }

  function setArchiveStatus(message, tone = "muted") {
    if (!state.statusEntries.archive) {
      return;
    }

    state.statusEntries.archive.className = `text-${tone}`;
    state.statusEntries.archive.textContent = message;
  }

  async function convertSelectedTracks() {
    if (state.selectedTracks.length === 0) {
      throw new Error("No tracks available to convert.");
    }

    const csrf = document.querySelector('meta[name="csrf-token"]').content;

    for (let i = 0; i < state.selectedTracks.length; i += 1) {
      const track = state.selectedTracks[i];
      if (!track) {
        continue;
      }

      await convertSingleTrack(track, i, csrf);
    }
  }

  async function convertSingleTrack(track, index, csrfToken) {
    const friendlyName = track.name || `Song ${index + 1}`;
    const labelPrefix = `Track ${index + 1}: ${friendlyName}`;
    setTrackStatusMessage(track.id, `${labelPrefix} — requesting conversion...`, "warning");

    const waitForTask = (taskId) =>
      new Promise((resolve, reject) => {
        setTrackStatusMessage(
          track.id,
          `${labelPrefix} — queued with premium servers...`,
          "warning"
        );

        pollGuestConversionTask(taskId, {
          onProgress: (progress) => {
            if (progress !== null && progress !== undefined) {
              setTrackStatusMessage(
                track.id,
                `${labelPrefix} — converting (${Math.round(progress)}% done)...`,
                "warning"
              );
            }
          },
          onSuccess: (url) => {
            track.downloadUrl = url;
            setTrackStatusMessage(
              track.id,
              `${labelPrefix} — converted successfully`,
              "success"
            );
            resolve();
          },
          onFailure: (message) => {
            setTrackStatusMessage(
              track.id,
              `${labelPrefix} — ${message || "conversion failed"}`,
              "danger"
            );
            reject(new Error(message || "Conversion failed."));
          },
        });
      });

    try {
      const response = await fetch("/convert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": csrfToken,
        },
        body: JSON.stringify({ urls: track.url }),
      });

      if (!response.ok) {
        throw new Error("Conversion request failed.");
      }

      const data = await response.json();

      if (data.error === false && data.url) {
        track.downloadUrl = data.url;
        setTrackStatusMessage(
          track.id,
          `${labelPrefix} — converted successfully`,
          "success"
        );
        return;
      }

      if (data.task_id || data.taskId) {
        await waitForTask(data.task_id || data.taskId);
        return;
      }

      const message =
        data.status ||
        data.message ||
        data.data ||
        "Conversion failed. Please try again later.";
      throw new Error(message);
    } catch (error) {
      setTrackStatusMessage(
        track.id,
        `${labelPrefix} — ${error.message || "conversion failed"}`,
        "danger"
      );
      throw error;
    }
  }

  function refreshSubmitMode() {
    const button = state.elements.submit;
    if (!button) {
      return;
    }

    if (state.downloadUrl) {
      button.dataset.mode = "download";
      button.classList.add("archive-mini__btn--download");
      button.classList.remove("archive-mini__btn--build");
      button.textContent = "Download mini ZIP";
    } else {
      button.dataset.mode = "build";
      button.classList.add("archive-mini__btn--build");
      button.classList.remove("archive-mini__btn--download");
      button.textContent = state.submitIdleLabel;
    }
  }

  function setDownloadReady(url) {
    state.downloadUrl = url || null;

    if (state.isBusy) {
      return;
    }

    refreshSubmitMode();
  }

  function startManualDownload() {
    if (!state.downloadUrl) {
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = state.downloadUrl;
    anchor.rel = "noopener";
    anchor.download = "";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }

  function setSubmitBusy(isBusy) {
    const button = state.elements.submit;
    state.isBusy = Boolean(isBusy);
    if (!button) {
      return;
    }

    if (isBusy) {
      state.downloadUrl = null;
      button.disabled = true;
      button.classList.add("archive-mini__btn--build");
      button.classList.remove("archive-mini__btn--download");
      button.innerHTML = `
        <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
        Preparing mini ZIP...
      `;
      return;
    }

    button.disabled = false;
    refreshSubmitMode();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (state.downloadUrl && !state.isBusy) {
      startManualDownload();
      return;
    }

    if (!state.sourceUrl) {
      const input = document.getElementById("trackUrl");
      state.sourceUrl = input ? input.value : "";
    }

    if (!state.sourceUrl) {
      setStatus("Please paste a Spotify link again and try.", "danger");
      return;
    }

    if (state.selectedTracks.length === 0) {
      setStatus("No tracks available for this Spotify link.", "danger");
      return;
    }

    setDownloadReady(null);
    setSubmitBusy(true);
    renderStatusEntries();
    setArchiveStatus("Archive: waiting for conversions", "muted");
    setStatus(
      `Converting the first ${state.selectedTracks.length} track${state.selectedTracks.length === 1 ? "" : "s"}...`,
      "warning"
    );

    try {
      await convertSelectedTracks();
    } catch (error) {
      setStatus(error.message || "Unable to convert the selected tracks.", "danger");
      setArchiveStatus("Archive: blocked due to conversion failure", "danger");
      setSubmitBusy(false);
      return;
    }

    setArchiveStatus("Archive: conversions complete. Preparing ZIP...", "warning");
    setStatus("Tracks converted. Building your mini ZIP...", "info");

    try {
      await buildArchive();
    } catch (error) {
      setStatus(error.message || "Unable to build the archive right now.", "danger");
      setArchiveStatus("Archive: failed to build mini ZIP", "danger");
      setDownloadReady(null);
    } finally {
      setSubmitBusy(false);
    }
  }

  async function buildArchive() {
    const response = await fetch("/archive", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": document.querySelector('meta[name="csrf-token"]').content,
      },
      body: JSON.stringify({
        spotify_url: state.sourceUrl,
        track_ids: state.selected.slice(0, state.maxSelectable),
        label: state.label,
      }),
    });

    const data = await response.json();

    if (data.error === false && data.url) {
      setDownloadReady(data.url);
      setArchiveStatus("Archive: ready. Click Download to save it.", "success");
      setStatus("Mini ZIP ready. Click Download to save it.", "success");
      return;
    }

    if (data.error === false && data.task_id) {
      await pollTask(data.task_id);
      return;
    }

    const message =
      data.message ||
      data.status ||
      "Unable to build a mini ZIP right now, please try again shortly.";
    throw new Error(message);
  }

  async function pollTask(taskId) {
    setStatus("Mini ZIP queued. Checking progress...", "warning");
    setArchiveStatus("Archive: queued with premium servers...", "warning");

    for (let attempt = 0; attempt < 40; attempt += 1) {
      await sleep(4500);

      try {
        const response = await fetch(
          `${tasksBaseUrl}/${encodeURIComponent(taskId)}`
        );
        const payload = await response.json();

        if (payload && !payload.error && payload.data) {
          const info = payload.data;
          const normalizedStatus = String(info.status || "").toLowerCase();

          if (info.progress) {
            setStatus(`Building ZIP (${info.progress}% done)...`, "warning");
            setArchiveStatus(
              `Archive: building ZIP (${info.progress}% done)`,
              "warning"
            );
          }

          if (normalizedStatus === "finished") {
            const url =
              extractDownloadUrlFromPayload(info) ||
              extractDownloadUrlFromPayload(info.result || {});

            if (url) {
              setDownloadReady(url);
              setArchiveStatus("Archive: ready. Click Download to save it.", "success");
              setStatus(
                "Mini ZIP ready. Click Download to save it.",
                "success"
              );
              return;
            }

            setDownloadReady(null);
            setArchiveStatus(
              "Archive: completed but no download link was provided.",
              "danger"
            );
            setStatus(
              "Archive completed but no download link was provided.",
              "danger"
            );
            return;
          }

          if (normalizedStatus === "failed") {
            setDownloadReady(null);
            const failureMessage =
              info.message || "Archive failed. Please try again later.";
            setArchiveStatus(`Archive: ${failureMessage}`, "danger");
            setStatus(
              info.message || "Archive failed. Please try again later.",
              "danger"
            );
            return;
          }
        }
      } catch (error) {
        console.error("Task polling failed", error);
      }
    }

    setDownloadReady(null);
    const timeoutMessage = "Archive is taking longer than expected. Please try again later.";
    setArchiveStatus(`Archive: ${timeoutMessage.toLowerCase()}`, "danger");
    setStatus(timeoutMessage, "danger");
  }

  return {
    init: (context, meta) => init(context, meta),
  };
})();

function initializeArchiveHelper(context, meta = {}) {
  archiveHelperModule.init(context, meta);
}

function extractDownloadUrlFromPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidates = [
    payload.url,
    payload.download_url,
    payload?.data?.url,
    payload?.data?.download_url,
    payload?.result?.download_url,
    payload?.result?.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate;
    }
  }

  return null;
}

function updateInlineProgressBar(progressBar, percent) {
  if (!progressBar) {
    return;
  }

  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  progressBar.style.width = `${value}%`;
  progressBar.setAttribute("aria-valuenow", String(value));
  progressBar.textContent = `${Math.round(value)}%`;
}

function extractProgressValue(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidates = [
    payload.progress,
    payload.percentage,
    payload.percent,
    payload?.result?.progress,
    payload?.data?.progress,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }

    const parsed = Number.parseFloat(candidate);
    if (!Number.isNaN(parsed)) {
      return Math.max(0, Math.min(100, parsed));
    }
  }

  return null;
}

async function pollGuestConversionTask(taskId, options = {}) {
  const { progressBar, onSuccess, onFailure, onProgress } = options;

  if (!taskId) {
    if (typeof onFailure === "function") {
      onFailure("Missing conversion task id.");
    }
    return;
  }

  const maxAttempts = 40;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleep(4500);

    let payload;
    try {
      const response = await fetch(`${tasksBaseUrl}/${encodeURIComponent(taskId)}`);
      if (!response.ok) {
        continue;
      }
      payload = await response.json();
    } catch (error) {
      console.error("Unable to poll conversion task", error);
      continue;
    }

    if (!payload) {
      continue;
    }

    if (payload.error) {
      const message = payload.message || payload.status || "Conversion failed before completion.";
      if (typeof onFailure === "function") {
        onFailure(message);
      }
      return;
    }

    const info = payload.data || {};
    const status = String(info.status || info.state || "").toLowerCase();

    const progress = extractProgressValue(info);
    if (progress !== null) {
      if (progressBar) {
        updateInlineProgressBar(progressBar, progress);
      }
      if (typeof onProgress === "function") {
        onProgress(progress);
      }
    }

    if (status === "finished") {
      if (progressBar) {
        updateInlineProgressBar(progressBar, 100);
      }
      const url =
        extractDownloadUrlFromPayload(info) ||
        extractDownloadUrlFromPayload(info.result || {}) ||
        extractDownloadUrlFromPayload(payload);

      if (url && typeof onSuccess === "function") {
        onSuccess(url);
      } else if (typeof onFailure === "function") {
        onFailure("Conversion finished but no download link was provided.");
      }
      return;
    }

    if (["failed", "error", "expired", "cancelled"].includes(status)) {
      const message =
        info.message ||
        info.error ||
        "This conversion request could not be completed.";
      if (typeof onFailure === "function") {
        onFailure(message);
      }
      return;
    }
  }

  if (typeof onFailure === "function") {
    onFailure("Conversion is taking longer than expected. Please try again shortly.");
  }
}


// function callBack(word) {
//     let div = document.createElement("div");
//   /** @type {string} */
//     div.className = "btn btn-new";
//     let node = document.createElement("a");

//     // return node.href = `/downloader?id=${word}`, node.target='_blank', node.onclick=`downloadImage(${word})`, node.style = "text-decoration:none;color: #ffffff!important;", node.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-download me-1" viewBox="0 0 16 16">
//     return node.href = word, node.target='_blank', node.onclick=`downloadImage(${word})`, node.style = "text-decoration:none;color: #ffffff!important;", node.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-download me-1" viewBox="0 0 16 16">
//   <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
//   <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/>
// </svg>Download`, div.appendChild(node),
//   div;
//   }


function callBack(word) {
  let div = document.createElement("div");
  div.className = "btn btn-new";

  let node = document.createElement("a");
  node.setAttribute("data-url", word); // Store the URL in a custom attribute
  node.onclick = function () {
    showModal(this.getAttribute("data-url")); // Pass the URL to the modal
  };
  node.style = "text-decoration:none;color: #ffffff!important;cursor:pointer;";
  node.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-download me-1" viewBox="0 0 16 16">
  <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
  <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/>
</svg>Download`;

  div.appendChild(node);
  return div;
}


function showModal(url) {
  // Create a new modal dynamically
  const modalHTML = `
        <div class="modal fade" id="dynamicModal" tabindex="-1" aria-labelledby="modalHeading" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title text-black" id="modalHeading">Help us to keep our Project alive 🙏</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-black text-center">
                        <p class="text-start">Proxy server costs are skyrocketing daily due to Spotify overprotective restrictions. Our developers are working tirelessly to maintain the service standards. But, it is getting difficult to meet the financial needs. Kindly donate; even a small chunk can be a source of hope for us 🤝</p>
                        <div class="progress">
                            <div class="progress-bar" role="progressbar" style="width: 0%" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                        </div>
                        <a class="btn w-100 d-inline-flex justify-content-center align-items-center" style="background-color: #FF6433;" href="https://ko-fi.com/E1E81C4D1F" target="_blank" rel="nofollow noopener">
                            <img height="36" style="border:0px;height:36px;" src="https://storage.ko-fi.com/cdn/kofi6.png?v=6" alt="Buy Me a Coffee" />
                        </a>
                        <br>
                        <div id="downloadButtonParent" class="mt-2 w-100" style="display:none;">
                            <a id="downloadButton" download="" rel="nofollow" class="btn btn-dark w-100 file-download" style="text-decoration: none; color:#ffffff;">
                                <i class="fa fa-download" aria-hidden="true"></i> Download
                            </a>
                        </div>
                        <br>
                        <a class="btn mt-2 btn-new w-100 d-inline-flex justify-content-center align-items-center" href="https://play.google.com/store/apps/details?id=com.spotmate.spotmatesongdownloader" target="_blank" rel="noopener" style="text-decoration: none; color:#ffffff;">
                            <i class="fa fa-play" aria-hidden="true"></i> Download SpotMate <i class="fa fa-android ms-1" aria-hidden="true"></i> App
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;

  // Append the modal to the body
  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Get the newly created modal elements
  const modalElement = document.getElementById("dynamicModal");
  const modal = new bootstrap.Modal(modalElement);
  const progressBar = modalElement.querySelector(".progress-bar");
  const downloadButton = modalElement.querySelector("#downloadButton");
  const downloadButtonParent = modalElement.querySelector("#downloadButtonParent");

  // Reset progress bar and download button
  progressBar.style.width = "0%";
  progressBar.setAttribute("aria-valuenow", 0);
  downloadButton.style.display = "none";
  downloadButtonParent.style.display = "none";

  // Show the modal
  modal.show();

  // Simulate progress
  let progress = 0;
  let interval = setInterval(() => {
    progress += 10;
    progressBar.style.width = progress + "%";
    progressBar.setAttribute("aria-valuenow", progress);

    if (progress >= 100) {
      clearInterval(interval);
      progressBar.closest(".progress").style.display = "none"; // Hide the progress bar
      downloadButton.href = url; // Set the URL
      downloadButton.style.display = "inline-block"; // Show the download button
      downloadButtonParent.style.display = "inline-block";
    }
  }, 10); // 500ms per 10% progress (5 seconds total)

  // Remove the modal from the DOM when it is closed
  modalElement.addEventListener("hidden.bs.modal", () => {
    modal.dispose(); // Dispose of the modal instance
    modalElement.remove(); // Remove the modal from the DOM
  });
}


function callbackfail(word) {
  let div = document.createElement("div");
  /** @type {string} */
  div.className = "btn btn-new";
  let node = document.createElement("a");

  return node.href = `${word}`, node.style = "text-decoration:none;color: #ffffff!important;", node.innerHTML = 'Refresh', div.appendChild(node),
    div;
}
function loader(type) {
  const option = document.createElement("div");
  option.id = type;
  const safeId = attributeEscape(type || "");
  option.innerHTML = `
    <div class="lds-ring"><div></div><div></div><div></div><div></div></div>
    <br>
    <div class="progress">
      <div id="e${safeId}" class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuemin="0" aria-valuemax="100">0%</div>
    </div>
    <div id="failederr" style="display:none; color:red;"><p>Try Again</p></div>
  `;

  const bar = option.querySelector(".progress-bar");
  if (bar) {
    bar.style.width = "0%";
    bar.setAttribute("aria-valuenow", "0");
  }

  return option;
}
function reload() {
  location.reload(true);
}

const input = document.querySelector(".main_page_text");
const paste = document.querySelector("#paste");
const clear = document.querySelector("#clear");
let supportPaste = "";
if (typeof navigator.clipboard !== "undefined") {
  supportPaste = navigator.clipboard.readText;
  if (supportPaste) {
    paste.style.display = "flex";
  }
}

const onPaste = function () {
  navigator.clipboard.readText().then(function (f) {
    input.value = f;
    paste.style.display = "none";
    clear.style.display = "flex";
  });
};

const onClear = function () {
  input.value = "";
  if (supportPaste) {
    paste.style.display = "flex";
  }

  clear.style.display = "none";
};

input.addEventListener("keyup", function (e) {
  if (input.value.length > 0) {
    paste.style.display = "none";
    clear.style.display = "flex";
  } else {
    if (supportPaste) {
      paste.style.display = "flex";
    }
    clear.style.display = "none";
  }
});

function dismissAlert(message, key) {
  if (sessionStorage.getItem(key)) {
  } else {
    const alertDiv = document.createElement("div");
    alertDiv.className = "alert alert-info alert-dismissible fade show mt-2";
    alertDiv.setAttribute("role", "alert");

    // Add the HTML content to the div
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    // Append the div to the element with id 'header'
    document.querySelector("#header").appendChild(alertDiv);

    sessionStorage.setItem(key, message);
  }
}
// dismissAlert('<strong>Sorry for Inconvenience !</strong> We sincerely apologize for the inconvenience caused. The download function is now active, and you can enjoy uninterrupted access to your favorite songs. Thank you for your understanding', 'sorryForDownload');
// dismissAlert('<strong>New Update!</strong> Now we support spotify Artist link.' , 'newsArtistSupport');
var params = new URLSearchParams(document.location.search);
// var youtubeId = params.get("v");
var spoturl = params.get("url");
if (spoturl) {
  document.querySelector('#trackUrl').value = spoturl;
  geturldata(spoturl);
  console.log('url got')
}
// Detect Android OS
var isAndroid = navigator.userAgent.match(/Android/i);

// Check if the user is using an Android device
if (isAndroid) {
  // Create the new anchor element
  var installAppLink = document.createElement("a");
  installAppLink.target = "_blank";
  installAppLink.href = "https://play.google.com/store/apps/details?id=com.spotmate.spotmatesongdownloader";
  installAppLink.className =
    "align-items-center d-flex justify-content-between btn btn-sm btn-sm-md text-new btn-light p-2 m-2 ";
  installAppLink.style = "font-weight: 400";
  installAppLink.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-phone mr-1" viewBox="0 0 16 16"> <path d="M11 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM5 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z"></path> <path d="M8 14a1 1 0 1 0 0-2 1 1 0 0 0 0 2"></path> </svg> Install App';

  // Get the #MobileNav element
  var mobileNav = document.getElementById("MobileNav");
  // mobileNav.classList.add("d-flex", "justify-content-end");
  // Insert the new element before the existing content
  mobileNav.insertBefore(installAppLink, mobileNav.firstChild);
}
