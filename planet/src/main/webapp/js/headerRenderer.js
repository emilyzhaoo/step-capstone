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

let currentUser;
const database = firebase.database();

export const HeaderRenderer = {
    init: (userId, displayName, location, bio, profilePic, username) => {
        currentUser = firebase.auth().currentUser;
        renderName(displayName);
        renderLocation(location, userId);
        renderBio(bio, userId);
        renderPicture(profilePic);
        if (currentUser !== null && userId === currentUser.uid) {
            addEditButton();
            addEditProfilePictureIcon(username, profilePic);
        }
    },
}

function renderName(displayName) {
    document.getElementById('display-name').innerText = displayName;
}

function renderLocation(location, userId) {
    document.getElementById('location').classList.add('valign-wrapper');
    if (location !== undefined) {
        addLocation(location);
        return;
    } 
    if (currentUser === null || userId !== currentUser.uid) {
        addLocation('Somewhere, World');
        return;
    }
    const addLocationLink = document.createElement('a');
    addLocationLink.innerText = 'Add Location';
    addLocationLink.addEventListener('click', addNewLocationForm);
    document.getElementById('location').innerHTML = '';
    document.getElementById('location').appendChild(addLocationLink);
}

function renderBio(bio, userId) {
    document.getElementById('bio').innerHTML = '';
    if (bio !== undefined) {
        document.getElementById('bio').innerText = bio;
        return;
    } 
    if (currentUser === null || userId !== currentUser.uid) {
        document.getElementById('bio').innerText = 'No Bio';
        return;
    }
    const addBioLink = document.createElement('a');
    addBioLink.addEventListener('click', addNewBioForm);
    addBioLink.innerText = 'Add Bio';
    document.getElementById('bio').appendChild(addBioLink);
}

function renderPicture(url) {
    if (url) {
        document.getElementById('profile-pic').src = url;
        return;
    }
    document.getElementById('profile-pic').src = '/images/profile-pic.png';
}

function addEditProfilePictureIcon(username, profilePic) {
    const profilePictureElement = document.getElementById('profile-pic-container');
    profilePictureElement.style.cursor = 'pointer';
    // Open the update profile dialog when the user clicks on the profile picture
    profilePictureElement.addEventListener('click', () => {
        if (profilePic) {
            document.getElementById('image-display').src = profilePic;
        }
        openModal('upload-picture-modal');
        fetch('/blobstore-upload-url?username=' + username)
        .then((response) => {
            return response.text();
        })
        .then((fileUrl) => {
            document.getElementById('upload-pic-form').action = fileUrl;
        });
    });
    // Display the photo camera icon when the mouse enters the profile picture
    profilePictureElement.addEventListener('mouseenter', (event) => {
        event.currentTarget.style.opacity = '0.7';
        const iconContainer = document.createElement('div');
        iconContainer.classList.add('center-align');
        iconContainer.style.position = 'absolute';
        iconContainer.style.width = '23%';
        const editIcon = document.createElement('i');
        editIcon.classList.add('material-icons');
        editIcon.style.fontSize = 'min(3vw, 32px)';
        editIcon.innerHTML = 'photo_camera';
        iconContainer.appendChild(editIcon);
        document.getElementById('profile-pic-container').appendChild(iconContainer);
    });
    // Reset the profile picture styling
    profilePictureElement.addEventListener('mouseleave', (event) => {
        event.currentTarget.style.opacity = '1';
        document.getElementById('profile-pic-container').lastElementChild.remove();
    });
}

function addNewLocationForm() {
    document.getElementById('location').classList.remove('valign-wrapper');
    const inputFields = document.createElement('div');
    // Create two input fields
    const city = createLocationInput('city-input', 'City');
    const country = createLocationInput('country-input', 'Country');
    // Create a comma
    const text = document.createElement('span');
    text.style.marginRight = '5px';
    text.innerText = ',';
    inputFields.appendChild(city);
    inputFields.appendChild(text);
    inputFields.appendChild(country);
    // Create the save button
    const saveButton = createHeaderButton('Save', saveLocation);
    // Create the cancel button
    const cancelButton = createHeaderButton('Cancel', cancelLocationEditing);
    // Create a button container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('row');
    buttonsContainer.style.margin = '0';
    buttonsContainer.appendChild(saveButton);
    buttonsContainer.appendChild(cancelButton);
    // Render the inputs
    document.getElementById('location').innerHTML = '';
    document.getElementById('location').appendChild(inputFields);
    document.getElementById('location').appendChild(buttonsContainer);
}

function createLocationInput(inputId, placeHolder) {
    const input = document.createElement('input');
    input.placeholder = placeHolder;
    input.type = 'text';
    input.style.borderRadius = '3px';
    input.style.backgroundColor = 'white';
    input.style.height = 'auto';
    input.style.width = '30%';
    input.style.margin = '0';
    input.id = inputId;
    return input;
}

function saveLocation() {
    const city = document.getElementById('city-input');
    const country = document.getElementById('country-input');
    if (city !== null && country !== null && 
        city.value !== '' && country.value !== '') {
        addLocationToDatabase(city.value + ', ' + country.value);
        return;
    }
    cancelLocationEditing();
}

function cancelLocationEditing() {
    renderLocation(undefined, currentUser.uid);
}

function addLocationToDatabase(location) {
    const userReference = database.ref('users/' + currentUser.uid);
    userReference.update({
        location: location
    }).then(() => {
        renderLocation(location, currentUser.uid);
    });
}

function addNewBioForm() {
    // Create the text area
    const textArea = document.createElement('textarea');
    textArea.placeholder = 'Describe yourself ...';
    textArea.style.borderRadius = '5px';
    textArea.style.fontFamily = 'cursive';
    textArea.style.backgroundColor = 'white';
    textArea.id = 'bio-textarea';
    // Create the save button
    const saveButton = createHeaderButton('Save', saveBio);
    // Create the cancel button
    const cancelButton = createHeaderButton('Cancel', cancelBioEditing);
    // Create a button container
    const buttonsContainer = document.createElement('div');
    buttonsContainer.classList.add('row');
    buttonsContainer.style.margin = '0';
    buttonsContainer.appendChild(saveButton);
    buttonsContainer.appendChild(cancelButton);
    // Render the text area and the buttons
    document.getElementById('bio').innerHTML = '';
    document.getElementById('bio').appendChild(textArea);
    document.getElementById('bio').appendChild(buttonsContainer);
}

function saveBio() {
    const textArea = document.getElementById('bio-textarea');
    if (textArea !== null && textArea.value !== '') {
        addBioToDatabse(textArea.value);
        return;
    }
    cancelBioEditing();
}

function cancelBioEditing() {
    renderBio(undefined, currentUser.uid);
}

function addBioToDatabse(bio) {
    const userReference = database.ref('users/' + currentUser.uid);
    userReference.update({
        bio: bio
    }).then(() => {
        renderBio(bio, currentUser.uid);
    });
}

function addLocation(location) {
    const locationElement = document.getElementById('location');
    const placeIcon = document.createElement('i');
    placeIcon.classList.add('tiny', 'material-icons', 'col');
    placeIcon.style.padding = '0';
    placeIcon.innerHTML = 'place'; 
    const text = document.createElement('p');
    text.style.paddingLeft = '0';
    text.style.margin = '0';
    text.classList.add('col');
    text.innerText = location;
    locationElement.innerHTML = '';
    locationElement.appendChild(placeIcon);
    locationElement.appendChild(text);
}

function addEditButton() {
    const element = document.getElementById('profile-header');
    if (element === null) {
        return;
    }
    const editIcon = document.createElement('i');
    editIcon.classList.add('tiny', 'material-icons', 'col');
    editIcon.style.padding = '0';
    editIcon.innerHTML = 'edit';

    const button = document.createElement('button');
    button.id = 'edit-button';
    button.classList.add('header-buttons');
    button.appendChild(editIcon);
    
    const buttonText = document.createElement('span');
    buttonText.innerText = 'Edit Profile';
    button.appendChild(buttonText);
    
    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('col', 's3');
    buttonContainer.style.position = 'absolute';
    buttonContainer.style.left = '75%';
    buttonContainer.appendChild(button);
    element.appendChild(buttonContainer);
}

function createHeaderButton(buttonText, clickHandler) {
    const headerButton = document.createElement('button');
    headerButton.classList.add('col', 'header-buttons');
    headerButton.innerText = buttonText;
    headerButton.addEventListener('click', clickHandler);
    return headerButton;
}
