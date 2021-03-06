// Copyright 2020 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/** Declare global variables */
let map;
let searchMarker;
let infoWindow;
let input;
let searchBox;
let markers = [];
let promises = [];
let bounds;
let count = 0;
let places;
const TORONTO_COORDINATES = {lat:43.6532, lng:-79.3832};

/** Initializes Map, implements search box and marks locations of searches */
function initMap() {
    // Create a map centered in Toronto
    map = new google.maps.Map(document.getElementById('map'), {
        center: TORONTO_COORDINATES,
        zoom: 8
    });

    // Create the search box and link it to the UI element.
    input = document.getElementById("pac-input");
    searchBox = new google.maps.places.SearchBox(input);
    // Set position of the search bar onto the map
    map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

    getCurrentLocation(); 
    updateSearch();
}

/** Creates marker at user's current location if allowed */
function getCurrentLocation(){
    // Gets users current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
            };
            // Create draggable marker at current location
            let searchMarker = new google.maps.Marker({
                position: pos,
                map: map,
                animation: google.maps.Animation.DROP,
                draggable: true
            });
            map.setCenter(pos);
        }, 
            // Set default marker to Toronto if user does not allow current location
            function() {
            let searchMarker = new google.maps.Marker({
                position: TORONTO_COORDINATES,
                map: map,
                animation: google.maps.Animation.DROP,
            });
            map.setCenter(TORONTO_COORDINATES);
            });
    } else {
        alert('Error: Your browser doesn\'t support geolocation.'); 
        // Set default marker to Toronto
        let searchMarker = new google.maps.Marker({
            position: TORONTO_COORDINATES,
            map: map,
            animation: google.maps.Animation.DROP,
        });
        map.setCenter(TORONTO_COORDINATES);
    }
}

/** Update markers and places when new search is performed */
function updateSearch() {    
    // Bias the SearchBox results towards current map's viewport.
    map.addListener('bounds_changed', function() {
        searchBox.setBounds(map.getBounds());
    });

    // Listener for when user selects new location
    searchBox.addListener('places_changed', function() {
        places = searchBox.getPlaces();
        if (places.length === 0) {
            return;
        }
        // Delete old markers
        markers.forEach(function(marker) {
            marker.setMap(null);
        });
        // Clear array of old markers and place information
        markers = [];
        placeInfo = [];

        bounds = new google.maps.LatLngBounds();
    
        // Display markers on map
        places.forEach(function(place) {
            if (!place.geometry) {
                console.log("Returned place contains no geometry");
                return;
            }
            createMarkers(place); 
            if (place.geometry.viewport) {
                bounds.union(place.geometry.viewport);
            } else {
                bounds.extend(place.geometry.location);
            }
        });
        addPlaceDetails(places);
        map.fitBounds(bounds);
    });
    // Add onclick function to option buttons
    addOnclick(); 
}

/** Add onclick function to option buttons */
function addOnclick() {
    document.getElementById('hotel').onclick = function() {
        document.getElementById('pac-input').value = 'hotel';
        setSearchByButton(); 
    }
    document.getElementById('food').onclick = function() {
        document.getElementById('pac-input').value = 'food';
        setSearchByButton(); 
    }
    document.getElementById('tourist').onclick = function() {
        document.getElementById('pac-input').value = 'tourist attractions';
        setSearchByButton(); 
    }
    document.getElementById('nature').onclick = function() {
        document.getElementById('pac-input').value = 'nature';
        setSearchByButton(); 
    }    
}

/** Search map when option button is clicked by triggering enter key */
function setSearchByButton() {
    const input = document.getElementById('pac-input');
    // Set trigger event on search box 
    google.maps.event.trigger(input, 'focus', {});
    // Set event to trigger the enter key , allowing search to process
    google.maps.event.trigger(input, 'keydown', { keyCode: 13 });
    google.maps.event.trigger(this, 'focus', {});
}

/** Create markers and add details to each place */
function addPlaceDetails() {
    // Clear results 
    document.getElementById('results').innerHTML = ""; 

    // Place Details Requests can only handle a query of 10 requests
    const limit = 10; 
    let splice = places.splice(0,limit);
    
    // For each place, get the icon, name and location.
    splice.forEach(function(place) {
        sendPlaceRequest(place);
    });

    // Check if all places have been displayed
    while (places.length > 0) {
        splice = places.splice(0,limit);    
        // Call remaining place requests in groups of max 10
        // Wait 5 seconds for request query to empty
        setTimeout(function () {
            splice.forEach(function(place) {
                sendPlaceRequest(place);
            })
        },5000);
    }
}

/** Create place requests */
function sendPlaceRequest(place) {
    // Make request with fields
    var place = {
        placeId: place.place_id,
        fields: ['place_id','name','rating','formatted_phone_number','formatted_address',
        'opening_hours','photos','url']
    };
    // Call Places Details Request
    let service = new google.maps.places.PlacesService(map);
    service.getDetails(place, callback); 
}

/** Callback function to handle place details response */
function callback(place, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        // Add place details to dictionary
        let placeDetails = {PlaceID: '',Name: '', Rating: '', Address: '', Photo: '',Phone: '',
        Hours: '', Website: ''}; 
        placeDetails['PlaceID'] = place.place_id;
        placeDetails['Name'] = place.name; 
        // Check if place details exist
        if (place.rating) {
            placeDetails['Rating'] = place.rating;    
        }
        if (place.formatted_address) {
            placeDetails['Address'] = place.formatted_address;
        }
        if (place.formatted_phone_number) {
            placeDetails['Phone'] = place.formatted_phone_number;
        }
        if (place.opening_hours) {
            let hours = [];
            hours.push('Opening Hours:');
            place.opening_hours.weekday_text.forEach((day) => {
                hours.push(day);
            }); 
            placeDetails['Hours'] = hours;
        }
        if (place.photos) {
            placeDetails['Photo'] = place.photos[0].getUrl({maxHeight:200});
        }
        if (place.url) {
            placeDetails['Website'] = place.url;
        }
        // List place when callback is finished
        renderResult(placeDetails);
    }
}

/** Create marker and add info window to place */
function createMarkers(place) {
    // Set icon properties
    let icon = { 
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25)
    };

    // Create a marker for each place
    let marker = new google.maps.Marker({
        map: map,
        icon: icon,
        title: place.name,
        position: place.geometry.location
    });        
        
    // Add markers to array
    markers.push(marker);

    // Create an info window for each place
    infoWindow = new google.maps.InfoWindow({
        content: ""
    });

    // Display info window with name when marker is clicked
    google.maps.event.addDomListener(marker,'click', function() {
        infoWindow.setContent(place.name);
        infoWindow.open(map, this); 
    });
}

/** List result of searched place on page*/
function renderResult(placeInfo) {
    let element = document.getElementById('results');
        
    // Create materialize card for each result by creating dom element in HTML
    let div1 = document.createElement('div');
    div1.classList.add('card'); 
    div1.classList.add('horizontal'); 
    let div2 = document.createElement('div');
    div2.classList.add('card-stacked');
    let div3 = document.createElement('div');
    div3.classList.add('card-content'); 

    // Create elements to add to HTML
    let p = document.createElement('p');
    let p1 = document.createElement('p');
    let p2 = document.createElement('p');
    let p3 = document.createElement('p');
    let p4 = document.createElement('p');
    let a = document.createElement('a');

    // Set variables for place details
    let name = document.createTextNode(placeInfo['Name']);
    let rating = document.createTextNode('Rating: ' + placeInfo['Rating']);
    let address = document.createTextNode(placeInfo['Address']);
    let phoneNumber = document.createTextNode('Phone Number: ' + placeInfo['Phone']);
    let img = document.createElement('img');
        
    // Display save icons
    let icon = createIcon(placeInfo['PlaceID']);
    div3.append(icon);

    // Check for missing details, otherwise display through HTML
    p.appendChild(name);        
    p.setAttribute('id','place-name');
    div3.appendChild(p);
    if (placeInfo['Rating'] != '') {
        p1.appendChild(rating);
        p1.setAttribute('id','place-rating');
        div3.appendChild(p1);
    }     
    if (placeInfo['Photo'] != '') {
        img.src = placeInfo['Photo'];
        div3.appendChild(img); 
    }      
    if (address != '') {
        p2.appendChild(address);
        p2.setAttribute('id','place-address');
        div3.appendChild(p2);
    }
    if (placeInfo['Phone'] != '') {
        p3.appendChild(phoneNumber);
        p3.setAttribute('id','phone-number');
        div3.appendChild(p3);         
    }
    if (placeInfo['Hours'] != '') {
        placeInfo['Hours'].forEach((day) => {
            p4.appendChild(createParagraphElement(day));
        });
        p4.setAttribute('id','opening-hours');   
        div3.appendChild(p4);      
    }
    if (placeInfo['Website'] != '') {
        a.appendChild(document.createTextNode('Google Maps'));
        a.href = placeInfo['Website'];
        a.title = 'More'; 
        div3.appendChild(a);
    }
    div2.appendChild(div3);
    div1.appendChild(div2); 
    element.appendChild(div1);
    
    // Add search keyword to header
    document.getElementById('greeting').innerHTML = 'Find a location: ' + document.getElementById('pac-input').value;
}

function createParagraphElement(content){
    const p = document.createElement('p');
    p.innerText = content;
    return p;
}

/** Create and add save icon */
function createIcon(placeID) {
    let icon = document.createElement('i');
    let currentUser = firebase.auth().currentUser;
    if (currentUser) {
        firebase.database().ref('users/' + currentUser.uid +'/places').child(placeID).once('value').then(function(snapshot) {
            // Places exist in the database if and only if they've previously been favourited by the user
            let exists = snapshot.exists();
            if (exists) {
                icon.innerHTML = 'favorite'; 
            }
            else {
                icon.innerHTML = 'favorite_border';
            }
        }); 
        // Allow user to save place if signed in
        icon.setAttribute('onclick','savePlace(this);');
    }
    else {
        icon.innerHTML = 'favorite_border'; 
        icon.setAttribute('onclick','createToast();');
    }
    icon.classList.add('material-icons','small');
    icon.setAttribute('name',placeID);
    return icon; 
}

/** Toggle save icon on click */
function savePlace(x) {
    let placeID = $(x).attr('name');
    let userID = firebase.auth().currentUser.uid; 
    if(x.innerHTML === "favorite_border") {
        // Set as saved
        x.innerHTML = "favorite";
        updateDatabase(placeID, userID); 
    }
    else {
        // Set as unsaved
        x.innerHTML = "favorite_border";
        deletePlace(placeID, userID);
    }
}

/** Update database and add placeID when place is saved by user */
function updateDatabase(placeID, userID) {
    const date = new Date();
    // The negative timestamp is for firebase sorting purposes in ascending order
    const time = -date.getTime();

    // Add placeID to current userID in user tree with negative timestamp
    firebase.database().ref('users/' + userID +'/places').child(placeID).set(time);
}

/** Delete placeID from current user when place is unsaved by user */
function deletePlace(placeID, userID) {
    firebase.database().ref('users/' + userID + '/places').child(placeID).remove();
}

/** Create toast alert when user saves place when not signed in */
function createToast() {
     M.toast({html: 'Sign in to start saving!', classes:'rounded'})
}
