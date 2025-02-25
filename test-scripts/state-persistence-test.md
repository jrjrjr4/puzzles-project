# State Persistence Testing Script

This document provides a structured approach to test the state persistence implementation in our chess puzzle application.

## Prerequisites
- A device with a web browser (Chrome, Firefox, Safari, or Edge)
- The application running either locally or on a deployed server

## Test 1: Guest User Persistence

### Setup:
1. Open the application in an incognito/private browsing window.
2. Wait for the application to load fully.

### Test Steps:
1. **Initial State Check**:
   - Note the initial puzzle displayed.
   - Note the initial ratings for various categories.

2. **Solve a Puzzle**:
   - Complete the current puzzle successfully.
   - Verify that ratings update appropriately.
   - Note the new ratings values.

3. **Page Refresh Test**:
   - Refresh the page (F5 or Ctrl+R).
   - Wait for the application to reload.

4. **Verification**:
   - Verify that you are still in guest mode.
   - Verify that the ratings are preserved (match the values from step 2).
   - Verify that the puzzle state is preserved.

5. **Browser Close and Reopen Test**:
   - Close the incognito/private window completely.
   - Open a new incognito/private window.
   - Navigate to the application.
   
6. **Verification**:
   - Note whether a new guest session is created or the previous one is restored.
   - If a new session is created, this is expected behavior for incognito mode.
   - Document the behavior.

## Test 2: Logged-in User Persistence

### Setup:
1. Open the application in a regular (non-incognito) browser window.
2. Log in with a valid user account.
3. Wait for the application to load fully.

### Test Steps:
1. **Initial State Check**:
   - Note the user's current puzzle.
   - Note the user's current ratings for various categories.
   - Note any history or progress indicators.

2. **Solve Multiple Puzzles**:
   - Complete at least 3 puzzles.
   - For one puzzle, solve it correctly.
   - For another puzzle, intentionally fail it.
   - Note the rating changes after each puzzle.

3. **Page Refresh Test**:
   - Refresh the page (F5 or Ctrl+R).
   - Wait for the application to reload.

4. **Verification**:
   - Verify that you are still logged in.
   - Verify that the ratings match what was recorded before refresh.
   - Verify that the current puzzle state is preserved.
   - Verify any history or progress indicators are accurate.

5. **Browser Close and Reopen Test**:
   - Close the browser window completely.
   - Open a new browser window.
   - Navigate to the application.
   
6. **Verification**:
   - Verify that you are still logged in (session persisted).
   - Verify that your ratings and progress are maintained.
   - Verify that the puzzle state is restored correctly.

## Test 3: Guest to Logged-in Transition

### Setup:
1. Open the application in a regular browser window without being logged in.
2. Solve at least 2 puzzles as a guest.
3. Note the current ratings and puzzle state.

### Test Steps:
1. **Login Transition**:
   - Log in with a valid user account.
   - Note what happens to the ratings and puzzle state.
   
2. **Verification**:
   - Verify that either:
     a) The guest ratings are merged with the user's stored ratings, or
     b) The user's stored ratings completely replace the guest ratings.
   - Document the actual behavior.
   - Verify that a new puzzle is loaded or the current puzzle remains.

3. **Refresh After Login**:
   - Refresh the page.
   - Verify that you remain logged in.
   - Verify that the correct ratings are displayed (user's ratings, not guest ratings).

## Test 4: Edge Cases and Error Recovery

### Test 4.1: Network Interruption

1. Open the application and log in.
2. Disable network connection (turn off Wi-Fi or use browser dev tools to simulate offline mode).
3. Try to solve a puzzle.
4. Verify the application's behavior:
   - Does it show appropriate error messages?
   - Does it attempt to save state locally?
5. Re-enable network connection.
6. Verify if state synchronizes correctly when back online.

### Test 4.2: LocalStorage Clearing

1. Open the application and log in.
2. Solve a puzzle and note the ratings.
3. Open browser dev tools and clear localStorage for the application domain.
4. Refresh the page.
5. Verify the recovery behavior:
   - Does it fetch state from Supabase?
   - Does it revert to default values?
   - Document the actual behavior.

### Test 4.3: Cross-Device Testing

1. Log in to the application on Device A (desktop/laptop).
2. Solve several puzzles and note the ratings.
3. Log in to the application on Device B (mobile or different computer).
4. Verify that the ratings and progress are synchronized between devices.

## Performance Testing

### Test 5.1: Load Time Measurement

1. Clear browser cache.
2. Open browser dev tools Performance tab.
3. Start recording and reload the application.
4. Measure:
   - Time to first contentful paint
   - Time until the application is interactive
   - Time until ratings and puzzle are loaded
5. Compare measurements for guest and logged-in users.

### Test 5.2: Storage Size Analysis

1. Open browser dev tools Application tab.
2. Examine localStorage size for the application.
3. Document the size of stored data.
4. Check if there are opportunities to reduce storage size.

## Documentation of Results

For each test, document:
1. Test date and time
2. Browser and version
3. Device type
4. Expected behavior
5. Actual behavior
6. Whether the test passed or failed
7. Any unusual observations

## Performance Optimization Recommendations

Based on the test results, document recommendations for:
1. Reducing the size of persisted state
2. Improving loading time
3. Enhancing error recovery
4. Optimizing authentication flow 