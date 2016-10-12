var CLIENT_ID = '47ekkmluwwcvrqj';

// Parses the url and gets the access token if it is in the urls hash
function getAccessTokenFromUrl() {
    return utils.parseQueryString(window.location.hash).access_token;
}

// If the user was just redirected from authenticating, the urls hash will
// contain the access token.
function isAuthenticated() {
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
        if (track.match(/\.(mp3|ogg|m4a)$/i)) {
            makeUrls.push(getUrlData(album,track));
        }
        
    });

    //TODO: definitely needs some re-factoring
    Promise.all(makeUrls).then(function (p) {
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

        p.forEach(function (linkData) {
            var li = document.createElement('li');
            var a = document.createElement('a');
            a.href = linkData.link;
            a.text = linkData.metadata.name;
            
            //had to use full names because relative paths turn into absolute paths for track.src 
            if (counter % 2 === 0) {
                a.dataset.bookmarks = 'http://localhost:9002/track.vtt';
            } else {
                a.dataset.bookmarks = 'http://localhost:9002/track.1.vtt';
            } counter++;
            
            a.addEventListener('click', function(e) {
                e.preventDefault();     
                
                //hack to avoid cues not being loaded when track being replaced is same track
                if (track.src !== this.dataset.bookmarks) {
                    output.innerHTML = '';  
                    track.src = ''; //gets rid of references to old cues   
                    audio.src = '';      
                    audio.src = this.href;
                    track.src = this.dataset.bookmarks;
                    audio.play();
                }
            });

            li.appendChild(a);
            filesContainer.appendChild(li);
        })

    });
}

var getUrlData = function (album, name) {
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