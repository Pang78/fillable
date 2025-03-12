# Letters.gov.sg - Bulk Letter Generation Visual Guide

## Overview

The Letters.gov.sg Bulk Letter Generation module allows you to generate multiple letters at once using templates from Letters.gov.sg. This visual guide will walk you through each step of the process with detailed instructions and examples.

---

## Quick Start Flow

1. Enter your API Key
2. Select a template
3. Add letter parameters (manually or via CSV import)
4. Set up notifications (optional)
5. Generate letters

---

## Detailed Step-by-Step Guide

### 1. API Configuration

#### Enter your API Key

1. Locate the API Key field in the API Configuration section
2. Enter your Letters.gov.sg API key
3. The key will be securely stored in your browser for future use

![API Key Entry Field](INSERT_API_KEY_SCREENSHOT.png)
_Image: API Key entry field_

#### Select a Template

**Option 1: Choose from available templates**

1. Click the blue "Select Template" button to see all templates available with your API key
2. Browse or search for your desired template
3. Click on a template to select it

![Template Selection Dialog](INSERT_TEMPLATE_SELECTION_SCREENSHOT.png)
_Image: Template selection dialog with search functionality_

**Option 2: Enter Template ID directly**

1. If you know your Template ID, enter it in the Template ID field
2. Click the green "Load Template" button to load the template details

![Template ID Entry](INSERT_TEMPLATE_ID_SCREENSHOT.png)
_Image: Template ID entry field and Load Template button_

> **Pro Tip**: The "Select Template" option is recommended for new users as it allows you to browse and search through all your available templates.

![Loaded Template](INSERT_LOADED_TEMPLATE_SCREENSHOT.png)
_Image: Successfully loaded template with field cards_

---

### 2. Adding Letter Parameters

Once your template is loaded, you need to add parameters for each letter you want to generate. There are two ways to do this:

#### Option 1: Manual Entry

For each letter you want to generate:

1. Fill in all required fields (marked with a red asterisk \*)
2. Add additional letters by clicking the purple "Add Another Letter" button
3. Remove letters by clicking the X in the top-right corner of each letter card

![Manual Letter Entry](INSERT_MANUAL_ENTRY_SCREENSHOT.png)
_Image: Manual entry form with multiple letter cards_

![Add Another Letter Button](INSERT_ADD_ANOTHER_LETTER_SCREENSHOT.png)
_Image: Purple "Add Another Letter" button_

#### Option 2: CSV Import

For bulk operations, you can import data from a CSV file:

1. Click the amber "Import CSV" button
2. Upload your CSV file by dragging and dropping or browsing your files
3. Map CSV columns to template fields
4. Preview the mapping
5. Click "Import Data & Close" to complete the import

![Import CSV Button](INSERT_IMPORT_CSV_BUTTON_SCREENSHOT.png)
_Image: Amber "Import CSV" button_

![CSV Upload Dialog](INSERT_CSV_UPLOAD_SCREENSHOT.png)
_Image: CSV upload interface with drag and drop area_

![CSV Mapping Interface](INSERT_CSV_MAPPING_SCREENSHOT.png)
_Image: CSV column to template field mapping interface_

![CSV Preview Mapping](INSERT_CSV_PREVIEW_SCREENSHOT.png)
_Image: Preview of mapped data_

> **Pro Tip**: Download an example template by clicking the teal "Download Example Template" button to see the correct CSV format for your template.

![Download Example Template](INSERT_DOWNLOAD_EXAMPLE_SCREENSHOT.png)
_Image: Download Example Template button_

---

### 3. Notification Settings (Optional)

If you want recipients to receive notifications when their letters are generated:

1. Toggle the blue "Enable Notification" switch
2. Select a notification method: SMS or Email
3. Enter recipient details (one per line):
   - For SMS: Phone numbers in international format (+6591234567) or local format (91234567)
   - For Email: Valid email addresses

![Enable Notifications Toggle](INSERT_ENABLE_NOTIFICATIONS_SCREENSHOT.png)
_Image: Enable Notification toggle switch_

![Notification Method Selection](INSERT_NOTIFICATION_METHOD_SCREENSHOT.png)
_Image: Notification method dropdown_

![Recipients Entry](INSERT_RECIPIENTS_SCREENSHOT.png)
_Image: Recipients text area with example entries_

> **Important**: The number of recipients must match the number of letters. Each recipient will receive a notification for their corresponding letter.

---

### 4. Generating Letters

Once you've set up all your parameters and optional notifications:

1. Review all your input to ensure accuracy
2. Click the large gradient "Generate X Letters" button at the bottom of the form
3. Wait for the system to process your request
4. On success, you'll receive a confirmation message with a Batch ID

![Generate Letters Button](INSERT_GENERATE_LETTERS_SCREENSHOT.png)
_Image: Generate Letters button with gradient styling_

![Success Confirmation](INSERT_SUCCESS_CONFIRMATION_SCREENSHOT.png)
_Image: Success confirmation with Batch ID_

---

## Common Workflows

### Single Letter Generation

1. Enter API Key
2. Select or enter Template ID
3. Fill in letter parameters
4. (Optional) Enable notifications and enter recipient details
5. Click "Generate 1 Letter"

### Multiple Letters with Different Parameters

1. Enter API Key
2. Select or enter Template ID
3. Fill in parameters for the first letter
4. Click "Add Another Letter"
5. Fill in parameters for additional letters
6. (Optional) Enable notifications and enter recipient details (one per letter)
7. Click "Generate X Letters"

### Bulk Import from CSV

1. Enter API Key
2. Select or enter Template ID
3. Click "Import CSV"
4. Upload CSV file
5. Map columns to template fields
6. Click "Import Data & Close"
7. (Optional) Enable notifications and enter recipient details
8. Click "Generate X Letters"

---

## Best Practices

### CSV Import Best Practices

- Ensure your CSV file has headers in the first row
- Match column names to template fields when possible for automatic mapping
- Include all required fields in your CSV
- Validate your data before importing
- Download an example template to see the correct format

![CSV Format Example](INSERT_CSV_FORMAT_EXAMPLE.png)
_Image: Example of properly formatted CSV file_

### Notification Best Practices

- Double-check recipient contact information for accuracy
- Ensure the number of recipients matches the number of letters
- For SMS, use the correct phone number format
- For international numbers, include the country code

### General Tips

- Test with a small batch first when doing bulk operations
- Save your API key by entering it once (it's stored locally)
- Use "Clear All (Keep API Key)" to start fresh without re-entering your API key
- Preview mapped data from CSV imports before proceeding

---

## Troubleshooting

### Common Issues and Solutions

#### "No Template Loaded" Message

**Potential causes and solutions:**

- Incorrect API key → Re-enter your API key
- Invalid Template ID → Verify the Template ID is correct
- Network issue → Check your internet connection and try again

![No Template Loaded Message](INSERT_NO_TEMPLATE_LOADED_SCREENSHOT.png)
_Image: "No Template Loaded" message_

#### CSV Import Errors

**Potential causes and solutions:**

- Improperly formatted CSV → Check your CSV format (headers in first row)
- Missing required fields → Ensure all required fields have values
- File too large → CSV must be under 5MB

![CSV Import Error](INSERT_CSV_IMPORT_ERROR_SCREENSHOT.png)
_Image: CSV import error message_

#### Notification Errors

**Potential causes and solutions:**

- Recipient count mismatch → Number of recipients must match number of letters
- Invalid phone numbers → Check phone number format
- Invalid email addresses → Verify email format

![Notification Error](INSERT_NOTIFICATION_ERROR_SCREENSHOT.png)
_Image: Notification configuration error_

---

## Feature Reference

### Interface Elements

#### Buttons

| Button                                                          | Description                        | Location                    | Action                                    |
| --------------------------------------------------------------- | ---------------------------------- | --------------------------- | ----------------------------------------- |
| ![Select Template](INSERT_SELECT_TEMPLATE_BUTTON_THUMBNAIL.png) | Blue "Select Template" button      | API Configuration section   | Opens template selection dialog           |
| ![Load Template](INSERT_LOAD_TEMPLATE_BUTTON_THUMBNAIL.png)     | Green "Load Template" button       | API Configuration section   | Loads template details using Template ID  |
| ![Import CSV](INSERT_IMPORT_CSV_BUTTON_THUMBNAIL.png)           | Amber "Import CSV" button          | Under template fields       | Opens CSV import dialog                   |
| ![Add Another Letter](INSERT_ADD_LETTER_BUTTON_THUMBNAIL.png)   | Purple "Add Another Letter" button | Bottom of letter parameters | Adds a new letter card                    |
| ![Generate Letters](INSERT_GENERATE_BUTTON_THUMBNAIL.png)       | Gradient "Generate Letters" button | Bottom of form              | Generates letters with current parameters |

#### Other Elements

| Element                                                          | Description                  | Location             |
| ---------------------------------------------------------------- | ---------------------------- | -------------------- |
| ![Enable Notification](INSERT_NOTIFICATION_TOGGLE_THUMBNAIL.png) | Notification toggle          | Notification section |
| ![Notification Method](INSERT_NOTIFICATION_METHOD_THUMBNAIL.png) | Notification method dropdown | Notification section |
| ![CSV Mapping](INSERT_CSV_MAPPING_THUMBNAIL.png)                 | CSV field mapping dropdown   | CSV import dialog    |

---

## Quick Reference Card

### Letters.gov.sg Bulk Letter Generation at a Glance

**Prerequisites:**

- Letters.gov.sg API key
- Access to letter templates
- Letter parameters

**Step 1: Configure API**

- Enter API key
- Select template

**Step 2: Add Letter Parameters**

- Manual entry or CSV import
- Fill all required fields

**Step 3: Set Up Notifications (Optional)**

- Enable notifications
- Choose SMS or Email
- Enter recipients (must match number of letters)

**Step 4: Generate Letters**

- Review all information
- Click "Generate Letters"
- Note the Batch ID in the success confirmation

**Need help?** Contact support with your error message, steps taken, and Template ID (never share your API key).

---

_This guide was last updated: [INSERT_DATE]_
