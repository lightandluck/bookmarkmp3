var CLIENT_ID = '47ekkmluwwcvrqj';

var audio = document.getElementById('audio'),
        track = document.getElementById('bookmark-track'),
        output = document.getElementById('cues'),
        source = document.getElementById('source'),
        btnAddCue = document.getElementById('btn-add-cue'),
        cueText = document.getElementById('cue-text'),
        textTrack,
        counter = 0;

track.addEventListener('load', showCues);

function showCues() {
    output.innerHTML = '';
    var c = audio.textTracks[0].cues;
    for (var i=0; i<c.length; i++) {
        var s = document.createElement("p");
        s.innerHTML = c[i].text;
        s.dataset.start = c[i].startTime;
        s.addEventListener("click",seek);
        output.appendChild(s);
    }
}

if (isAuthenticated()) {
    showPageSection('authed-section');

    // Create an instance of Dropbox with the access token and use it to
    // fetch and render the files in the users root directory.
    var dbx = new Dropbox({ accessToken: getAccessTokenFromUrl() });

    //TODO: robust file retrieval and traversal
    dbx.filesListFolder({ path: '/Bucky' })
        .then(function (response) {
            renderItems(response.entries);
        })
        .catch(function (error) {
            console.error(error);
        });
    
} else {
    showPageSection('pre-auth-section');

    // Set the login anchors href using dbx.getAuthenticationUrl()
    //TODO: place dbx in closure, so that it is not available from console
    //TODO: place auth token in local storage so it can be used when not in url
    var dbx = new Dropbox({ clientId: CLIENT_ID });
    var authUrl = dbx.getAuthenticationUrl('http://localhost:9002/');

    //TODO: move auth to sign link
    document.getElementById('authlink').href = authUrl;
}


// Parses the url and gets the access token if it is in the urls hash
function getAccessTokenFromUrl() {
    return utils.parseQueryString(window.location.hash).access_token;
}

// If the user was just redirected from authenticating, the urls hash will
// contain the access token.
function isAuthenticated() {
    //TODO: use dropbox api to check if user is logged in without url hash
    return !!getAccessTokenFromUrl();
}

function sortByName(a, b) {
    var nameA = a.name.toUpperCase(); // ignore upper and lowercase
    var nameB = b.name.toUpperCase(); // ignore upper and lowercase
    if (nameA < nameB) {
        return -1;
    }
    if (nameA > nameB) {
        return 1;
    }
    // names must be equal
    return 0;
}

function seek(e) {
    audio.currentTime = this.dataset.start;
    if(audio.paused){ audio.play(); }
};

// Render a list of items to #files
function renderItems(items) {
    var filesContainer = document.getElementById('filelist');

    //TODO: Iterate to get album name
    var album = "/Bucky",
        makeUrls = [];
    items.sort(sortByName);
    items.forEach(function (item) {
        //TODO: Add check for music files and check for commas in names which need to be escaped somehow to be found properly
        var track = item.name;

        /* push promises of urls into Array */
        if (track.match(/\.(mp3|ogg|m4a)$/i)) {
            makeUrls.push(getUrlData(album,track));
        }
        
    });

    //TODO: definitely needs some re-factoring
    /* Loops over array of promises  */
    Promise.all(makeUrls).then(function (p) {
        p.forEach(function (linkData) {
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = linkData.link;
            a.text = linkData.metadata.name;
            
            var vttlink = dbx.filesGetTemporaryLink({
                path: linkData.metadata.path_display.replace(/\.(mp3|ogg|m4a)$/i, ".vtt")
            });

            vttlink.then( vttlinkData => {
                if (!vttlinkData.error) {
                    a.dataset.bookmarks = vttlinkData.link;
                }
            });

            a.addEventListener('click', function(e) {
                e.preventDefault();     
                //hack to avoid cues not being loaded when track being replaced is same track
                if (track.src !== this.dataset.bookmarks) {
                    btnAddCue.removeEventListener('click', addCue, false);
                    output.innerHTML = '';  
                    track.src = ''; //gets rid of references to old cues   
                    audio.src = '';      
                    audio.src = this.href;
                    track.src = this.dataset.bookmarks;
                    track.dataset.trackname = linkData.metadata.name;
                    audio.load();
                    audio.play();
                    textTrack = audio.textTracks[0];
                    btnAddCue.addEventListener('click', addCue, false);
                }
            });

            li.appendChild(a);
            filesContainer.appendChild(li);
        })

    });
}

function addCue() {
    textTrack.addCue(new VTTCue(audio.currentTime, audio.currentTime + 5, cueText.value));
    console.log('Added cue');
    //TODO: add logic to check if sync is necessary, make sure we don't overwrite files in error
    dbx.filesAlphaUpload(cuesToWebVTT(textTrack.cues));
    showCues();
}

//converts cues with non-enumerable properties into JSON to be saved
function cuesToJSON(cues) {
    return JSON.stringify(Array.from(cues)
        .map( obj => {
            return {
                text: obj.text,
                startTime: obj.startTime,
                endTime: obj.endTime
            }
        })
    );
}

function cuesToWebVTT(cues) {
    var arr = Array.from(cues);
    var str = "WEBVTT\n\n";

    arr.forEach(function(cue) {
        var text = secondsToHms(cue.startTime) + ' --> ' + secondsToHms(cue.endTime) +
            '\n' + cue.text + '\n\n';

        str += text; 
    });

    return {
        contents: new Blob([str.trim()], { type: 'text/plain' }),
        path: '/Bucky/01 (entire) -  January 20.vtt',
        mode: { '.tag': 'overwrite' },
        mute: true
    }
}

function secondsToHms(d) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);
    //look for first 3 digits of milliseconds
    var re = /\.\d{1,3}/.exec(d);
    var mi;
    if (re) {
        mi = re[0]
    } else {
        mi = '.000'
    }

    return pad(h) + ':' + pad(m) + ':' + pad(s) + mi;
}

function pad(n) {
    return n < 10 ? "0" + n : n.toString()
}

function getUrlData(album, name) {
    var path;
    path = album + '/' + name;
    var pathObj = { path: path };
    return dbx.filesGetTemporaryLink(pathObj);
}

// This example keeps both the authenticate and non-authenticated setions
// in the DOM and uses this function to show/hide the correct section.
function showPageSection(elementId) {
    document.getElementById(elementId).style.display = 'block';
}

