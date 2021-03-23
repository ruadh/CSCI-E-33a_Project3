// Initialize a global for storing the current mailbox context so all functions can access it
// Its value will be set when we call loadMailbox on DOMContentLoaded in the next block
var currentMailbox = null;

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

  // Store the selected mailbox's name in our global so other functions will know where we are
  currentMailbox = mailbox;

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
          // TO DO:  Should this be TO in the sent box?  (waiting for clarirfication)
          appendNewElement('span', `From:  ${emails[email].sender}`, 'from', summary);
          appendNewElement('span', `&emsp;${emails[email].subject}`, null, summary);
          appendNewElement('span', `&emsp;${emails[email].timestamp}`, 'timestamp', summary);
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

// Helper function:  creates a new HTML element and appends it to the parent
function appendNewElement(element, innerHTML, cssClass = null, parent) {
  const child = document.createElement(element);
  child.innerHTML = innerHTML;
  if (cssClass !== null) {
    child.classList.add(cssClass);
  }
  parent.appendChild(child);
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
      if (currentMailbox !== 'sent') {
        const archiveButton = document.createElement('button');
        archiveButton.addEventListener('click', () => updateArchived(email.id, !email.archived));
        archiveButton.classList.add('mailbox-button');
        if (email.archived === true) {
          archiveButton.innerHTML = 'Unarchive';
        } else {
          archiveButton.innerHTML = 'Archive';
        }
        block.appendChild(archiveButton);
      }

      // Add the reply button
      const replyButton = document.createElement('button');
      replyButton.innerHTML = 'Reply';
      replyButton.classList.add('mailbox-button');
      replyButton.addEventListener('click', () => loadReply(email));
      block.appendChild(replyButton);

      // Render the message components
      appendNewElement('h4', email.timestamp, 'timestamp', block);
      appendNewElement('h4', `From:  ${email.sender}`, 'from', block);
      appendNewElement('h4', `To:  ${email.recipients}`, 'recipients', block);
      appendNewElement('h4', `Subject:  ${email.subject}`, 'subject', block);
      appendNewElement('p', email.body, 'body', block);
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


// TO DO:  Refactor to pass just the whole email, not the ID, and toggle it
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

function loadReply(email) {
  composeEmail();
  document.querySelector('#compose-recipients').value = email.sender;
  if (email.subject.slice(0, 4) === 'Re: ') {
    document.querySelector('#compose-subject').value = email.subject;
  } else {
    document.querySelector('#compose-subject').value = `Re: ${email.subject}`;
  }
  document.querySelector('#compose-body').value = `\n\n\nOn ${email.timestamp} ${email.sender} wrote:\n\n${email.body}`;
  enableSubmit();
}