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


import TimeRange from './TimeRange.js';
import {renderPlaces} from './placesItinerary.js';
// Declare global functions
window.openAddEventForm = openAddEventForm;
window.closeAddEventForm = closeAddEventForm;
window.openSaveEventsForm = openSaveEventsForm;
window.closeSaveEventsForm = closeSaveEventsForm;
window.handleStartingLocationChange = handleStartingLocationChange;
window.renderStartingLocation = renderStartingLocation;
window.handleListOptionChange = handleListOptionChange;
window.addEvent = addEvent;
window.saveEvents = saveEvents;
window.generateItinerary = generateItinerary;

let autocomplete; 

// function initAutocomplete() {
//     let input = document.getElementById('starting-address');
//     let options = {
//         types: ['geocode']
//     };
//     autocomplete = new google.maps.places.Autocomplete(input,options); 
//     autocomplete.setFields(['address_component']);
//     autocomplete.addListener('place_changed', fillAddress);
// }

function openAddEventForm() {
    document.getElementById('add-event').style.display = 'block';
}

// Clear input values and close the form
function closeAddEventForm() {
    document.getElementById('add-event-name').value = '';
    document.getElementById('add-event-address').value = '';
    document.getElementById('add-event-duration').value = '';
    document.getElementById('add-event').style.display = 'none';
}

function openSaveEventsForm() {
    document.getElementById('save-events-form').style.display = 'block';
    document.getElementById('save-events-button').style.display = 'none';
}

function closeSaveEventsForm() {
    document.getElementById('save-events-button').style.display = 'inline-block';
    document.getElementById('save-events-form').style.display = 'none';
}

function handleStartingLocationChange() {
    if (typeof(Storage) !== 'undefined') {
        sessionStorage.setItem('start', document.getElementById('starting-address').value);
    } else {
        alert ('Please update your browser'); 
    } 
}

function renderStartingLocation() {
    if (sessionStorage.getItem('start')) {
        document.getElementById('starting-address').value = sessionStorage.getItem('start');
    }
}

export function fillAddress() {
    console.log('filled'); 
    let place = autocomplete.getPlace();
    console.log(place);

    // for (var i = 0; i < place.address_components.length; i++) {
    //     var addressType = place.address_components[i].types[0];
    //     if (componentForm[addressType]) {
    //         var val = place.address_components[i][componentForm[addressType]];
    //         document.getElementById(addressType).value = val;
    //     }
    // }
}

function renderListOptions() {
    const userId = firebase.auth().currentUser.uid;
    const eventListRef = database.ref('events/' + userId);
    const selectListElement = document.getElementById('list-options');
    // Show the option "current list" regardless of what's stored in the database
    selectListElement.innerHTML = '<option value="currentList">Current List </option>';
    eventListRef.once('value', function(eventsSnapshot) {
        eventsSnapshot.forEach(function(childListSnapshot) {
            let childKey = childListSnapshot.key;
            if (childKey !== 'currentList') {
                let optionElement = document.createElement('option');
                optionElement.value = childKey;
                optionElement.innerText = childKey;
                selectListElement.add(optionElement);
                // Update the selected value
                if (childKey === sessionStorage.getItem('listName')) {        
                    optionElement.selected = true;
                }
            }
        });
        // Initialize the select tag again since options are dynamically loaded
        M.FormSelect.init(selectListElement, {});
    });
}

function handleListOptionChange() {
    const listName = document.getElementById ('list-options').value;
    sessionStorage.setItem('listName', listName);
    // You can only save currentList as other lists
    if (listName !== 'currentList') {
        document.getElementById('save-events-button').style.display = 'none';
    }else{
        document.getElementById('save-events-button').style.display = 'inline-block';
    }
    renderEvents(listName);
    renderPlaces();
}

// Add an event to the firebase realtime database
// Todo: input validation, success/failure callbacks
async function addEvent() {
    const eventName = document.getElementById('add-event-name').value;
    const eventAddress = document.getElementById('add-event-address').value;
    const eventDuration = document.getElementById('add-event-duration').value;
    const userId = firebase.auth().currentUser.uid; 
    const listName = document.getElementById('list-options').value;

    // Validate the input fields
    if (!validateCustomEventInput(eventName, eventAddress, eventDuration)){
        return;
    }
    
    // Set every event's opening hours to 8am - 5pm for now
    const openingTime = TimeRange.getTimeInMinutes(8,0);
    const closingTime = TimeRange.getTimeInMinutes(17,0);

    const eventListRef = database.ref('events/' + userId + '/' + listName);
    // Get the order number by counting existing events
    const eventListSnapshot = await eventListRef.once('value');
    const order = eventListSnapshot.numChildren() + 1;

    //Create a new event
    const newEventRef = eventListRef.push();
    newEventRef.set({
        name: eventName,
        address: eventAddress,
        duration: eventDuration,
        openingTime: openingTime,
        closingTime: closingTime,
        order: order,
    });
    closeAddEventForm();
}

function validateCustomEventInput(name, address, duration) {
    let isValid = true;
    if (!name) {
        alert('Please make sure to fill out the event name');
        isValid = false;
        return isValid;
    }
    if (!address) {
        alert('Please make sure to fill out the event address');
        isValid = false;
        return isValid;
    }
    if (!duration) {
        alert('Please make sure to fill out the event duration (0~9 hours inclusive)');
        isValid = false;
        return isValid;
    }
    if (duration < 0 || duration > 9) {
        alert('Please make sure duration is between 0 to 9 hours (inclusive)');
        isValid = false;
        return isValid;
    }
    return isValid;
}

// Check authentication status and render the list of events if the user has
// sign in.
// Todo: discuss with teammates to decide what to show if user is not signed in.
firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
        renderListOptions();
        renderEvents(sessionStorage.getItem('listName'));
        renderPlaces();
    } else {
        console.log('Please sign in');
    }
});

function renderEvents(listName) {
    const userId = firebase.auth().currentUser.uid;
    const eventListRef = database.ref('events/' + userId + '/' + listName);
    eventListRef.orderByChild('order').on('value', (eventListSnapshot) => {
        const eventsContainer = document.getElementById('events');
        eventsContainer.innerHTML = '';
        eventListSnapshot.forEach(function(childEvent) {
            let eventObject = childEvent.val();
            let eventElement = createEventElement (listName,
                                                childEvent.key,
                                                eventObject.name, 
                                                eventObject.address, 
                                                eventObject.duration);
            eventsContainer.appendChild(eventElement);
        });
    });
}

function createEventElement(listName, ref, name, address, duration) {
    const eventElement = document.createElement('div');
    eventElement.setAttribute('class', 'card event');
    eventElement.setAttribute('id', ref);
    eventElement.innerHTML = 
        `<div class="card-content">
          <span class="card-title">` + name + `</span>
          <p>` + address +`</p>
        </div>
        <div class="card-action">
          <a>` + duration + ` hours </a>
        </div>`;
    const deleteButton = document.createElement('button');
    deleteButton.innerText = 'Delete';
    deleteButton.addEventListener('click', () => {
        deleteEvent(listName, ref);
    });
    eventElement.appendChild(deleteButton);
    return eventElement;
}

function deleteEvent(listName, ref) {
    const userId = firebase.auth().currentUser.uid;
    const eventListRef = database.ref('events/' + userId + '/' + listName);
    const toBeDeletedEventRef = eventListRef.child(ref);
    toBeDeletedEventRef.remove();

    // Fix order after deleting the event
    eventListRef.orderByChild('order').once('value', (eventListSnapshot) => {
        let count = 1;
        eventListSnapshot.forEach(function(childEvent) {
            let event = childEvent.val();
            let eventKey = childEvent.key;
            if (event.order !== count) {
                eventListRef.child(eventKey).update({
                    order: count
                });
            }
            count += 1;
        });
    });

    // Check if this is an event created from a place, and if so, 
    // remove the user id from the visitors list 
    const placeRef = database.ref('places/' + ref);
    placeRef.once('value', (placeSnapshot) => {
        if (placeSnapshot.val()) {
            placeRef.child('visitors').child(userId).remove();
        }
    });

    // Render places again since the icons might need to change
    renderPlaces();
}

async function saveEvents() {
    const listName = document.getElementById('save-events-name').value;
    if (!listName) {
        alert('Please input a list name!');
        return;
    }
    const userId = firebase.auth().currentUser.uid;
    const currentListRef = database.ref('events/' + userId + '/currentList');
    const newListRef = database.ref('events/' + userId + '/' + listName);
    const currentListSnapshot = await currentListRef.once('value');
    if (!currentListSnapshot.val()) {
        alert('Cannot save an empty list');
        return;
    }
    newListRef.set(currentListSnapshot.val());
    // Clear current list
    currentListRef.remove();
    // Update the select tag options and close save events form
    renderListOptions();
    closeSaveEventsForm();
}

async function generateItinerary() {
    if (!sessionStorage.getItem('start')) {
        alert('Please input a valid starting address');
        return;
    }
    
    const requestBody = [];
    // Add the starting point as the first event
    const startingPoint = {name: "Start", 
                        address: sessionStorage.getItem('start'), 
                        duration: 0,
                        openingTime: TimeRange.getStartOfDay(),
                        closingTime: TimeRange.getEndOfDay(),
                        order: 0};
    requestBody.push(startingPoint);
    
    // Add the rest of the events
    const userId = firebase.auth().currentUser.uid;
    const listName = document.getElementById('list-options').value;
    const eventListRef = database.ref('events/' + userId + '/' + listName);
    const eventListSnapshot = await eventListRef.once('value');
    eventListSnapshot.forEach(function(childEvent) {
        requestBody.push(childEvent.val());
    });
    const itineraryResponse = await fetch('/generate-itinerary', 
                        {method: 'POST', 
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(requestBody) });
    const itinerary = await itineraryResponse.json();
    createItinerary(itinerary);
}

function timeToString(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    const hoursString = hours < 10 ? ('0' + hours) : hours;
    const minutesString = minutes < 10 ? ('0' + minutes) : minutes;
    return hoursString + ':' + minutesString;
}

function createItinerary(items) {
    const itineraryContainer = document.getElementById('itinerary');
    itineraryContainer.innerHTML = '';

    items.forEach((item) => {
        // Only show one time stamp for 0 length events.
        if (item.when.start === item.when.end) {
            itineraryContainer.innerHTML += '<li>' + item.name + ', ' + item.address + ', ' + 
                                timeToString(item.when.start) + '</li>';
        }else {
            itineraryContainer.innerHTML += '<li>' + item.name + ', ' + item.address + ', ' + 
                timeToString(item.when.start) + ' - ' + timeToString(item.when.end) + '</li>';
        }
    });
}

// Initialize the select tags
document.addEventListener('DOMContentLoaded', function() {
    let elems = document.querySelectorAll('select');
    let instances = M.FormSelect.init(elems, {});
});

// jQuery function that reorders the events on the front end
$(function() { 
    $( "#events" ).sortable({
        update: function() { 
            reorderEvents(); 
        }       
    }); 
}); 

// Reorder in firebase
function reorderEvents() { 
    $('.event').each(function (i) {
        const userId = firebase.auth().currentUser.uid;
        const listName = document.getElementById('list-options').value;
        const eventRef = database.ref('events/' + userId +'/' + listName + '/' + this.id);
        eventRef.update({
            order: i+1
        });
    });
} 
