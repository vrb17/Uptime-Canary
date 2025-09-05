# Checks Page Test Guide

## Prerequisites
1. Start the development server: `npm run dev`
2. Create a user account at `/signup`
3. Login at `/login`

## Test Scenarios

### 1. Initial Load
- Navigate to `/checks`
- **Expected**: Loading skeletons appear, then either:
  - Empty state with "No checks yet" message (new user)
  - List of existing checks (if any exist)

### 2. Create Check
- Click "Add Check" button
- Fill in the form:
  - Name: "Test Website"
  - URL: "https://example.com"
  - Method: "GET"
  - Interval: "Every 1 minute"
  - Timeout: "5000"
  - Expected Status: "200"
  - Enabled: ✓
- Click "Add Check"
- **Expected**: 
  - Dialog closes
  - Success toast appears
  - New check appears at top of list
  - Form resets

### 3. Edit Check
- Click the three dots menu on any check
- Select "Edit"
- Change the name to "Updated Test Website"
- Click "Save Changes"
- **Expected**:
  - Dialog closes
  - Success toast appears
  - Check name updates in the list

### 4. Delete Check
- Click the three dots menu on any check
- Select "Delete"
- Confirm deletion in the dialog
- **Expected**:
  - Confirmation dialog closes
  - Success toast appears
  - Check disappears from list

### 5. Error Handling
- Try to create a check with invalid URL (e.g., "not-a-url")
- **Expected**: Error toast with validation message

- Try to create a check without name or URL
- **Expected**: Submit button disabled

### 6. Authentication
- Logout and try to access `/checks`
- **Expected**: Redirected to `/login`

## API Integration Verification

### Data Flow
1. **GET /api/checks** - Loads checks on page load
2. **POST /api/checks** - Creates new checks
3. **PATCH /api/checks/[id]** - Updates existing checks
4. **DELETE /api/checks/[id]** - Deletes checks

### State Management
- Loading states with skeletons
- Error states with toast notifications
- Success states with toast notifications
- Form validation (client-side URL validation)
- Pending states (disabled buttons during API calls)

### Security
- 401 responses redirect to login
- Users can only see/edit/delete their own checks
- Form validation prevents invalid data submission

## Success Criteria
✅ Page loads with real data from API  
✅ Create/edit/delete operations work  
✅ Loading and error states display correctly  
✅ Toast notifications appear for all actions  
✅ 401 errors redirect to login  
✅ Form validation works  
✅ No TypeScript errors  
✅ No console errors  
