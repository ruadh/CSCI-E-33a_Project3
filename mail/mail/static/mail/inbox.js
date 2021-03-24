// Initialize a storage global so all functions can know the current mailbox context
// Its value is set when we call loadMailbox on DOMContentLoaded in the next block
var currentMailbox = null;

// Initial page load
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

// Helper function:  create a new HTML element with the specified innerHTML and optional class
// Note:  I originally had it append the result to the parent element as well, but I removed it,
//        since we sometimes need to add child elements or event listeners before appending.
function newElement(element, innerHTML, cssClass = null) {
  const child = document.createElement(element);
  child.innerHTML = innerHTML;
  if (cssClass !== null) {
    child.classList.add(cssClass);
  }
  return child;
}

function loadMailbox(mailbox) {

  // Store the selected mailbox's name in our global so other functions will know where we are
  currentMailbox = mailbox;

  // Create a container element for the message lines
  const messageList = document.createElement('div');

  // Get the messages via the API
  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {
      if (emails.length > 0) {
        // Add each email's summary line
        for (const email in emails) {
          // Create the the line and make it clickable to load the message detail
          const summary = newElement('div', null, 'message-row');
          summary.addEventListener('click', () => loadMessage(emails[email].id));
          // Style the line based on it's read/unread status
          if (emails[email].read === true) {
            summary.classList.add('read');
          }
          // Add the message header details
          if (mailbox === 'sent') {
            // Vlad said it was okay to display the To: for sent messages, even though the spec calls for From:
            summary.appendChild(newElement('span', `To:  ${emails[email].recipients}`, 'to'));
          } else {
            summary.appendChild(newElement('span', `From:  ${emails[email].sender}`, 'from'));
          }
          summary.appendChild(newElement('span', `&emsp;${emails[email].subject}`));
          summary.appendChild(newElement('span', `&emsp;${emails[email].timestamp}`, 'timestamp'));
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

      // Add the archive/unarchive button  (except when viewing sent messages)
      if (currentMailbox !== 'sent') {
        const archiveButton = newElement('button', '', 'mailbox-button');
        if (email.archived === true) {
          archiveButton.innerHTML = 'Unarchive';
        } else {
          archiveButton.innerHTML = 'Archive';
        }
        archiveButton.addEventListener('click', () => updateArchived(email));
        block.appendChild(archiveButton);
      }

      // Add the reply button
      const replyButton = newElement('button', 'Reply', 'mailbox-button');
      replyButton.addEventListener('click', () => loadReply(email));
      block.appendChild(replyButton);

      // Add the message header info
      block.appendChild(newElement('h4', email.timestamp, 'timestamp'));
      block.appendChild(newElement('h4', `From:  ${email.sender}`, 'from'));
      block.appendChild(newElement('h4', `To:  ${email.recipients}`, 'recipients'));
      block.appendChild(newElement('h4', `Subject:  ${email.subject}`, 'subject'));

      // Add the message body, preserving the line breaks
      let body = '';
      email.body.split('\n').forEach(line => {
        body += `${line}<br>`;
      });
      block.appendChild(newElement('p', body, 'body'));

      // Add all the content to the page
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
    // (The user doesn't know that we tried to mark it as read, so they don't need to see an error in this situation.)
    .then(response => {
      if (response.ok !== true) {
        console.log(`Error marking read: ${response}`);
      }
    });
}


// Toggle an email's archived status

function updateArchived(email) {
  // Update the message via the API
  fetch(`/emails/${email.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        archived: !email.archived
      })
    })
    // Error handling
    .then(response => {
      console.log(response);
      if (response.ok === true) {
        loadMailbox('inbox');
      } else {
        alert('An unexpected error occurred.  Your message\'s archived status has NOT been changed.');
        console.log(`Error updating archived status: ${response}`);
      }
    });
}

function loadReply(email) {
  console.log('reply');
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