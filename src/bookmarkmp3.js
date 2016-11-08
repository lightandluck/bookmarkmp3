var CLIENT_ID = '47ekkmluwwcvrqj';

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

var audio = document.getElementById('audio'),
        track = document.getElementById('bookmark-track'),
        output = document.getElementById('cues'),
        source = document.getElementById('source'),
        counter = 0;

track.addEventListener('load', function() {
    output.innerHTML = '';
    var c = audio.textTracks[0].cues;
    for (var i=0; i<c.length; i++) {
        var s = document.createElement("p");
        s.innerHTML = c[i].text;
        s.dataset.start = c[i].startTime;
        s.addEventListener("click",seek);
        output.appendChild(s);
    }
});

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
        //TODO: Add check for music files and check for commas
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
                    output.innerHTML = '';  
                    track.src = ''; //gets rid of references to old cues   
                    audio.src = '';      
                    audio.src = this.href;
                    track.src = this.dataset.bookmarks;
                    track.dataset.trackname = linkData.metadata.name;
                    audio.load();
                    audio.play();
                    texttrack = audio.textTracks[0];
                }
            });

            li.appendChild(a);
            filesContainer.appendChild(li);
        })

    });
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
    })

    return str.trim();
}

function secondsToHms(d) {
    d = Number(d);
    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);
    var re = /\.\d*/.exec(d);
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
    var dbx = new Dropbox({ clientId: CLIENT_ID });
    var authUrl = dbx.getAuthenticationUrl('http://localhost:9002/');

    //TODO: move auth to sign link
    document.getElementById('authlink').href = authUrl;
}