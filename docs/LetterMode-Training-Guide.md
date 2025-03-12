# Letters.gov.sg - Bulk Letter Generation Training Guide

## Overview

The Letters.gov.sg Bulk Letter Generation module allows you to generate multiple letters at once using a template from Letters.gov.sg. This guide will walk you through the process of generating bulk letters, importing data from CSV files, and sending notifications to recipients.

## Prerequisites

Before you begin, you will need:

1. A valid Letters.gov.sg API key
2. Access to at least one letter template
3. The necessary letter parameters for each letter you want to generate

## Step-by-Step Guide

### 1. API Configuration

1. **Enter your API Key**

   - Input your Letters.gov.sg API key in the designated field
   - Your API key is stored locally in your browser and never sent to our servers
   - The key will be saved for future sessions

2. **Select a Template**
   - There are two ways to select a template:
     - **Option 1**: Enter the Template ID directly in the input field and click "Load Template"
     - **Option 2**: Click the "Select Template" button to browse and search available templates
   - After selecting a template, the system will automatically load the template fields

### 2. Adding Letter Parameters

Once a template is loaded, you can add letter parameters in two ways:

#### Option 1: Manual Entry

1. The system will display a card for each letter with input fields for all template parameters
2. Required fields are marked with an asterisk (\*)
3. Fill in the required information for each letter
4. Click "Add Another Letter" to add more letters as needed
5. To remove a letter, click the X button in the top-right corner of the letter card

#### Option 2: CSV Import

1. Click the "Import CSV" button
2. You can either drag and drop a CSV file or click to browse your files
3. After uploading, you'll see a preview of the CSV data
4. Map each template field to the corresponding CSV column
   - The system will attempt to automatically map fields with matching names
   - Required fields are highlighted in red
5. Click "Preview Mapping" to see how your data will be mapped
6. Click "Import Data & Close" to import the data

**CSV Format Tips:**

- The first row should contain column headers
- Each row represents one letter
- You can download an example template by clicking "Download Example Template"
- Maximum file size is 5MB

### 3. Notification Settings

If you want to send notifications when letters are generated:

1. Toggle the "Enable Notification" switch
2. Select a notification method:
   - **SMS**: Recipients will receive a text message
   - **Email**: Recipients will receive an email
3. Enter the recipients:
   - One recipient per line
   - For SMS: Use international format (+6591234567) or local format (91234567)
   - For Email: Use valid email addresses
4. **Important**: The number of recipients must match the number of letters. Each recipient will receive a notification for their corresponding letter.

### 4. Generating Letters

1. Review all parameters and notifications settings
2. Click "Generate X Letter(s)" button
3. Wait for the system to generate your letters
4. On success, you'll receive a confirmation message with a Batch ID

## Best Practices

1. **Always validate your data before importing**

   - Check for missing or incorrect information
   - Ensure all required fields are filled

2. **Test with a small batch first**

   - When generating a large number of letters, test with a few first

3. **Save your API key**

   - The system remembers your API key for convenience
   - You can clear all form fields while keeping your API key using the "Clear All (Keep API Key)" button

4. **Double-check recipient information**
   - Ensure phone numbers are in the correct format
   - Verify that email addresses are valid
   - Confirm the number of recipients matches the number of letters

## Troubleshooting

### Common Issues

1. **"No Template Loaded" message**

   - Verify your API key is correct
   - Make sure the Template ID exists and you have access to it
   - Click "Load Template" after entering the Template ID

2. **Import CSV errors**

   - Ensure your CSV file is properly formatted with headers
   - Check that all required fields have values
   - Verify the CSV file is not larger than 5MB

3. **Notification errors**

   - Confirm you've selected a notification method (SMS or Email)
   - Ensure phone numbers are in the correct format
   - Verify that the number of recipients matches the number of letters

4. **API errors**
   - Check your API key
   - Ensure you have the necessary permissions
   - Verify that your template exists
   - Make sure all required fields are filled correctly

### Getting Help

If you encounter issues not covered in this guide, please contact support with the following information:

- The error message you received
- The steps you were taking when the error occurred
- Your Template ID (do not share your API key)

## Advanced Features

### Working with Multiple Templates

If you need to generate letters using different templates:

1. Complete the generation process for the first template
2. Click "Clear All (Keep API Key)"
3. Select a new template and repeat the process

### CSV Import Best Practices

1. **Prepare your CSV file**

   - Include all required fields as columns
   - Use clear, descriptive headers that match or are similar to template field names
   - Ensure all data is formatted correctly

2. **Field Mapping**
   - Take time to verify the automatic mappings
   - Pay special attention to required fields
   - Use the preview feature to confirm mappings before importing

## Conclusion

The Bulk Letter Generation module simplifies the process of creating multiple letters at once using the Letters.gov.sg service. By following this guide, you should be able to efficiently generate letters and send notifications to recipients.

Remember to always review your data before final submission and test with small batches when working with new templates or large data sets.
