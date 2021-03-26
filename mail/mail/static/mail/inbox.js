// Initialize a global to store the current mailbox, so other functions know the context
// Its value is set below when we call loadMailbox on DOMContentLoaded
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


/**
 * Load the compose email form
 */

function composeEmail() {

  // Show compose view and hide other views
  displaySegment('#compose-view');

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value = '';
  document.querySelector('#compose-body').value = '';

  // Disable the Submit button until recipients are entered
  document.querySelector('#submit-email').disabled = true;
  document.querySelector('#compose-recipients').addEventListener('keyup', enableSubmit);
}


/**
 * Disable the submit button when the recipients field is empty
 */

function enableSubmit() {

  recipients = document.querySelector('#compose-recipients');
  if (recipients.value.length > 0) {
    document.querySelector('#submit-email').disabled = false;
  } else {
    document.querySelector('#submit-email').disabled = true;
  }

}


/**
 * Show the specified page segment and hide the others
 * @param {number} id - The id of the HTML element you want to show.
 */

function displaySegment(id) {
  // Disable them all
  document.querySelector('#reader-view').style.display = 'none';
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  // Reenable the one we want to view
  document.querySelector(id).style.display = 'block';
}


/**
 * Create a new HTML element with the specified innerHTML and optional classes
 * @param {string} element - The type of HTML element to be created
 * @param {string} innerHTML - The inner HTML to be added to the new element
 * @param {string} [cssClass] - A space-delimited list of classes to be added to the new element
 * 
 * NOTE: It would also be useful to support adding the event listeners here,
 * but passing a function with an unknown number of parameters is beyond my skills right now.
 */

function newElement(element, innerHTML, cssClass = null) {
  const child = document.createElement(element);
  child.innerHTML = innerHTML;
  if (cssClass !== null) {
    cssClass.split(' ').forEach(cssClass => {
      child.classList.add(cssClass);
    });
  }
  return child;
}


/**
 * Load the specified mailbox
 * @param {string} mailbox - The name of the mailbox to be loaded.  
 * 
 * Supported values for mailbox are listed in the API documentation: 
 * https://cs50.harvard.edu/extension/web/2021/spring/projects/3/mail/
 */

function loadMailbox(mailbox) {

  // Store the selected mailbox's name in our global so other functions will know where we are
  currentMailbox = mailbox;

  // Create a container element for the message lines
  const messageList = document.createElement('div');
  messageList.innerHTML = 'Loading Mailbox...';

  // Disable the navigation buttons (except logout) while the mailbox loads
  // NOTE:  I use this pattern several times, but it seems too short to be worth making into a function
  document.querySelectorAll('.loading-disable').forEach(button => {
    button.disabled = true;
  });

  // Get the messages via the API
  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {

      // Clear the loading message and show the message count instead
      messageList.innerHTML = '';
      const count = emails.length;
      // CITATION:  I learned about the ternary operator from MDN at https://mzl.la/3fdzDF9
      messageList.appendChild(newElement('p', `${count} message${(count === 1 ? '' : 's')}`));

      // Create a summary line for each message
      if (count > 0) {
        for (const email in emails) {
          // Create the the line and make it clickable to load the message detail
          const summary = newElement('div', null, 'list-row');
          summary.addEventListener('click', () => loadMessage(emails[email].id));
          // Style the line based on it's read/unread status
          if (emails[email].read === true) {
            summary.classList.add('read');
          }
          // Add the message header details
          if (mailbox === 'sent') {
            // Vlad said it was okay to display the To: for sent messages, even though the spec calls for From:
            summary.appendChild(newElement('span', `To:  ${emails[email].recipients}`, 'message-address'));
          } else {
            summary.appendChild(newElement('span', `From:  ${emails[email].sender}`, 'message-address'));
          }
          summary.appendChild(newElement('span', `&emsp;${emails[email].subject}`));
          summary.appendChild(newElement('span', `&emsp;${emails[email].timestamp}`, 'list-timestamp'));

          // Append the full line to the div 
          messageList.appendChild(summary);

        }
      }

      // Reenable the navigation buttons
      document.querySelectorAll('.loading-disable').forEach(button => {
        button.disabled = false;
      });

    })

  // Show the mailbox and hide other views
  displaySegment('#emails-view');

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Add the list of messages
  document.querySelector('#emails-view').appendChild(messageList);
}


/**
 * Send a message using the values in the Compose form
 */

function sendEmail() {

  // Prevent the user from repeatedly pressing the Submit button if there is a delay
  document.querySelector('#submit-email').disabled = true;

  // Prevent normal form submission, which would refresh the page
  event.preventDefault();

  // Gather the form values
  // NOTE:  We are NOT validating the form contents, since the API checks the recipients,
  // and the spec does not prohibit other things we might validate like blank emails, sending to self, etc.
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
      // Load the sent mailbox or show an error
      error = result.error;
      if (error !== undefined) {
        alert(error);
        // Reenable the Submit button so the user can try again
        document.querySelector('#submit-email').disabled = false;
      } else {
        loadMailbox('sent');
      }
    });

}


/**
 * Display a single message
 * @param {number} id - The ID of the email to be retrieved
 */

function loadMessage(id) {

  // Clear any previously-existing content in the reader view
  // The message rows are cleared at this point, so we don't have to prevent multiple clicks.
  document.querySelector('#reader-view').innerHTML = 'Loading Message...';

  // Retrieve the message via the API
  fetch(`/emails/${id}`)
    .then(response => response.json())
    .then(email => {

      // Mark the message as read
      markRead(id);

      // Create a container element for the message view
      const block = document.createElement('div');

      // Create a flex container for the archive/unarchive and reply buttons
      const actionButtons = newElement('div', '', 'action-buttons');

      // Add the archive/unarchive button, except when viewing sent messages
      if (currentMailbox !== 'sent') {
        const archiveButton = newElement('button', '', 'mailbox-button btn btn-primary');
        if (email.archived === true) {
          archiveButton.innerHTML = 'Unarchive';
        } else {
          archiveButton.innerHTML = 'Archive';
        }
        archiveButton.addEventListener('click', () => updateArchived(email));
        actionButtons.appendChild(archiveButton);
      }

      // Add the reply button
      const replyButton = newElement('button', 'Reply', 'mailbox-button btn btn-primary');
      replyButton.addEventListener('click', () => loadReply(email));
      actionButtons.appendChild(replyButton);

      // Append the buttons to the block
      block.appendChild(actionButtons);

      // Add the message header info
      // block.appendChild(newElement('h4', email.timestamp, 'timestamp'));
      block.appendChild(newElement('h4', `From:  ${email.sender}`));
      block.appendChild(newElement('h4', `To:  ${email.recipients}`));
      block.appendChild(newElement('h4', `Subject:  ${email.subject}`));
      block.appendChild(newElement('h4', email.timestamp));

      // Add the message body, preserving the line breaks
      let body = '';
      email.body.split('\n').forEach(line => {
        body += `${line}<br>`;
      });
      block.appendChild(newElement('p', body, 'body'));

      // Clear the loading message and add all the content to the page
      document.querySelector('#reader-view').innerHTML = '';
      document.querySelector('#reader-view').appendChild(block);
    });

  // Show reader view and hide other views
  displaySegment('#reader-view');

}


/**
 * Mark a single message as read
 * @param {number} id - The ID of the email to be modified
 */

function markRead(id) {
  // Update the message's read status via the API
  fetch(`/emails/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        read: true
      })
    })
    // If the message can't be marked read, log an error to the console
    // (The user doesn't know that our function tried to mark it as read, so they don't need to see an error in this situation.)
    .then(response => {
      if (response.ok !== true) {
        console.log(`Error marking read: ${response}`);
      }
    });
}


/**
 * Toggle an email's archived status
 * @param {object} email - The email object whose status should be updated
 */

function updateArchived(email) {

  // Disable the archive/unarchive and reply buttons so the user can't keep pressing them if there is a delay
  // CITATION:  I got help with the forEach syntax from https://stackoverflow.com/a/51330000
  document.querySelectorAll('.mailbox-button').forEach(button => {
    button.disabled = true
  });

  // Update the message via the API
  fetch(`/emails/${email.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        archived: !email.archived
      })
    })
    // Load the inbox, or show an error message
    .then(response => {
      if (response.ok === true) {
        loadMailbox('inbox');
      } else {
        alert('An unexpected error occurred.  Your message\'s archived status has NOT been changed.');
        console.log(`Error updating archived status: ${response}`);
        // Re-enable the the archive/unarchive and reply buttons, so the user can try again
        document.querySelectorAll('.mailbox-button').forEach(button => {
          button.disabled = false
        });
      }
    });
}


/**
 * Load the selected email into the compose form as a quoted reply
 * @param {object} email - The email object to quote in the reply
 */

function loadReply(email) {

  // Note:  I am NOT disabling the reply button to prevent repeated clicks.
  //        Since this doesn't interact with the API, substantial delays are unlikely,
  //        and the consequences are minimal.

  // Load the compose form and populate it with the quoted message
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