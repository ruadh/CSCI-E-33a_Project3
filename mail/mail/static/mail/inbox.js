document.addEventListener('DOMContentLoaded', function () {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => loadMailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => loadMailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => loadMailbox('archive'));
  document.querySelector('#compose').addEventListener('click', composeEmail);

  // Submit button on compose form uses JS instead of submitting the page
  document.querySelector('#compose-form').addEventListener('submit', sendEmail);

  // By default, load the inbox
  loadMailbox('inbox');
});

function composeEmail() {

  // Show compose view and hide other views
  document.querySelector('#reader-view').style.display = 'none';
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';

  // Disable the Submit button until recipients are entered
  document.querySelector('#submit-email').disabled = true;
  document.querySelector('#compose-recipients').addEventListener('keyup', enableSubmit);
}

// Disable the submit button when the recipients field is empty
function enableSubmit() {

  recipients = document.querySelector('#compose-recipients');
  if (recipients.value.length > 0) {
    document.querySelector('#submit-email').disabled = false;
  } else {
    document.querySelector('#submit-email').disabled = true;
  }

}

function loadMailbox(mailbox) {

  // Get the messages via the API
  const messageList = document.createElement('div');
  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {
      // Add each email's summary line
      if (emails.length > 0) {
        // console.log(emails);
        for (const email in emails) {
          // TO DO REFACTOR:  DRY
          const summary = document.createElement('div');
          summary.classList.add('message-row')
          summary.addEventListener('click', () => loadMessage(emails[email].id));
          if (emails[email].read === true) {
            summary.classList.add('read');
          }
          const from = document.createElement('span');
          from.innerHTML = `From:  ${emails[email].sender}`;
          from.classList.add('from');
          summary.appendChild(from);
          const subject = document.createElement('span');
          subject.innerHTML = `&emsp;${emails[email].subject}`;
          summary.appendChild(subject);
          const timestamp = document.createElement('span');
          timestamp.innerHTML = `&emsp;${emails[email].timestamp}`;
          timestamp.classList.add('timestamp');
          summary.appendChild(timestamp);
          // Append the full line to the div 
          messageList.appendChild(summary);
        }
      }
    })

  // Show the mailbox and hide other views
  document.querySelector('#reader-view').style.display = 'none';
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Add the list of messages
  document.querySelector('#emails-view').appendChild(messageList);
}


// Send a message
function sendEmail() {

  // Prevent submission of form & refresh of the page
  event.preventDefault();

  // We are NOT validating the form contents, since the API checks the recipients,
  // And the spec does not prohibit blank emails, sending to self, etc.
  form = document.querySelector('#compose-form');
  to = form.querySelector('#compose-recipients').value;
  subject = form.querySelector('#compose-subject').value;
  body = form.querySelector('#compose-body').value;

  // Send the message via the API
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: to,
      subject: subject,
      body: body
    })
  })
    .then(response => response.json())
    .then(result => {
      error = result.error;
      if (error !== undefined) {
        alert(error);
      } else {
        loadMailbox('sent');
      }
    });

}


// Load a message
function loadMessage(id) {

  // Clear any previously-existing content in the reader view
  document.querySelector('#reader-view').innerHTML = '';

  // Retrieve the message via the API
  fetch(`/emails/${id}`)
    .then(response => response.json())
    .then(email => {

      // Mark the message as read
      markRead(id);

      // Create a container element for the message view
      const block = document.createElement('div');

      // Add the archive/unarchive button
      const archiveButton = document.createElement('button');
      archiveButton.addEventListener('click', () => updateArchived(email.id, !email.archived));
      if (email.archived === true) {
        archiveButton.innerHTML = 'Unarchive';
      } else {
        archiveButton.innerHTML = 'Archive';
      }
      // TO DO:  add the button action
      block.appendChild(archiveButton);

      // Render the message components
      // TO DO: REFACTOR as DRY
      const timestamp = document.createElement('h4');
      timestamp.innerHTML = email.timestamp;
      timestamp.classList.add('timestamp');
      block.appendChild(timestamp);
      const from = document.createElement('h4');
      from.innerHTML = `From:  ${email.sender}`;
      from.classList.add('from');
      block.appendChild(from);
      const recipients = document.createElement('h4');
      recipients.innerHTML = `To:  ${email.recipients}`;
      recipients.classList.add('recipients');
      block.appendChild(recipients);
      const subject = document.createElement('h4');
      subject.innerHTML = `Subject:  ${email.subject}`;
      subject.classList.add('subject');
      block.appendChild(subject);
      const body = document.createElement('p');
      body.innerHTML = email.body;
      body.classList.add('body');
      block.appendChild(body);
      document.querySelector('#reader-view').appendChild(block);
    });

  // Show reader view and hide other views
  document.querySelector('#reader-view').style.display = 'block';
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

}


function markRead(id) {
  // Update the message via the API
  fetch(`/emails/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      read: true
    })
  })
    // If the message can't be marked read, log it to the console
    // (The user doesn't need to see an error in this case)
    .then(response => {
      if (response.ok !== true) {
        console.log(`Error marking read: ${response}`);
      }
    });
}


function updateArchived(id, boolean) {
  // Update the message via the API
  fetch(`/emails/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: boolean
    })
  })
  // Error handling
    .then(response => {
      console.log(response);
      if (response.ok === true) {
        loadMailbox('inbox');
      } else {
        // TO DO:  should we show the user an error here?
        console.log(`Error updating archived status: ${response}`);
      }
    });
}