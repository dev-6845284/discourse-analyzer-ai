# DoubleCheck AI - Modular Architecture

## 📁 Project Structure

```
src/
├── components/
│   ├── auth/
│   │   ├── LoginScreen.tsx         # Google Sign-In UI
│   │   └── UserMenu.tsx            # (Future: User dropdown/logout)
│   ├── controls/                   # (Future: Search/Settings components)
│   ├── results/
│   │   ├── ErrorDisplay.tsx        # Error and API response display
│   │   └── (More to come)
│   ├── AddQuoteModal.tsx
│   ├── AnalysisReport.tsx
│   ├── QuoteCard.tsx
│   └── Spinner.tsx
├── hooks/
│   ├── useAuth.ts                  # Authentication logic
│   ├── useApiKeys.ts               # API key management
│   ├── useSearchParams.ts          # Search parameters state
│   ├── useTimePeriod.ts            # Time period selection
│   ├── useQuotes.ts                # Quote operations (search, analyze, extract)
│   ├── useQuoteFilters.ts          # Filtering and sorting logic
│   └── useUIState.ts               # UI state (modals, collapsed panels)
├── utils/
│   ├── auth.ts                     # Auth helper functions
│   ├── localStorage.ts             # localStorage utilities
│   ├── timePeriod.ts               # Time period calculations
│   └── quotes.ts                   # Quote filtering/sorting utilities
├── services/
│   ├── geminiService.ts            # Gemini AI integration
│   └── grokService.ts              # Grok AI integration
├── config/
│   └── app.config.ts               # App configuration constants
├── constants.ts                    # Shared constants
├── types.ts                        # TypeScript types
├── App.tsx                         # Main app component (~350 lines, down from 746!)
└── index.tsx
```

## 🎯 Key Improvements

### Before Refactoring
- **746 lines** in App.tsx
- **20+ useState** hooks
- **12+ handler functions**
- All logic, state, and UI mixed together
- Difficult to test and maintain

### After Refactoring
- **~350 lines** in App.tsx (53% reduction!)
- Logic separated into **7 custom hooks**
- Utilities extracted into **4 helper modules**
- Components organized by function
- Much easier to test, maintain, and extend

## 📚 Custom Hooks

### `useAuth()`
Manages Google authentication state and initialization.

**Returns:**
- `user` - Current user info
- `loginError` - Login error message
- `googleButtonRef` - Ref for Google Sign-In button
- `handleLogout` - Logout handler

### `useSearchParams()`
Manages all search-related parameters.

**Returns:**
- `personName`, `selectedLanguages`, `resultCount`, etc.
- Setters for all parameters
- `handleLanguageChange` - Toggle language selection
- `clearTextToExtract` - Clear extract textarea

### `useTimePeriod()`
Manages time period selection with localStorage persistence.

**Returns:**
- `timePeriodType`, `timePeriodValue` - Current selection
- `customDateFrom`, `customDateTo` - Custom date range
- `handleTimePeriodTypeChange`, `handleTimePeriodValueChange` - Update handlers
- `getTimePeriod()` - Calculate current time period

### `useQuotes()`
Manages quote operations (search, analyze, extract, add, update).

**Returns:**
- `quotes`, `isLoading`, `error`, `rawApiResponseError` - State
- `handleSearch` - Search for quotes
- `handleAnalyzeQuote` - Analyze a quote
- `handleExtractQuotes` - Extract quotes from text
- `handleAddQuoteManually` - Add a manual quote
- `handleUpdateQuoteLanguage` - Update quote language
- `handleClearQuotes` - Clear all quotes
- `clearError` - Clear error messages

### `useQuoteFilters()`
Manages filtering and sorting of quotes.

**Returns:**
- `sortOrder`, `filterCategory`, `filterRating` - Current filters
- Setters for all filters
- `filteredAndSortedQuotes` - Computed filtered/sorted list

### `useUIState()`
Manages UI-specific state (modals, collapsed panels).

**Returns:**
- `isFormCollapsed`, `isAddModalOpen` - UI state
- `toggleFormCollapsed`, `openAddModal`, `closeAddModal` - Actions

## 🛠️ Utilities

### `auth.ts`
- `decodeJwt(token)` - Decode JWT tokens
- `isLocalEnvironment()` - Check if running locally
- `shouldBypassAuth()` - Determine if auth should be bypassed
- `getDefaultLocalUser()` - Get default dev user

### `localStorage.ts`
- `loadFromStorage(key)` - Load and parse from localStorage
- `saveToStorage(key, value)` - Save to localStorage
- `removeFromStorage(key)` - Remove from localStorage

### `timePeriod.ts`
- `getTimePeriodDescription(...)` - Calculate date range and description

### `quotes.ts`
- `filterByCategory(quotes, category)` - Filter by category
- `filterByRating(quotes, rating)` - Filter by rating
- `sortQuotesByDate(quotes, order)` - Sort by date
- `isQuoteDuplicate(quote, quotes)` - Check for duplicates
- `filterAndSortQuotes(...)` - Apply all filters and sort

## 🔧 Configuration

### `app.config.ts`
Central configuration for:
- Google Client ID
- Default search parameters
- localStorage keys

## 📦 Components

### Auth Components
- **LoginScreen**: Google Sign-In interface

### Results Components
- **ErrorDisplay**: Shows errors and raw API responses

### Existing Components
- **QuoteCard**: Display individual quotes
- **AddQuoteModal**: Modal for adding quotes
- **AnalysisReport**: Quote analysis display
- **Spinner**: Loading indicator

## 🚀 Future Expansion Ideas

### Additional Components to Extract
1. **SettingsSection** - API key inputs
2. **SearchSection** - Quote search form
3. **TimePeriodSelector** - Time period UI
4. **LanguageSelector** - Language selection UI
5. **ResultsHeader** - Results header with filters
6. **ExtractSection** - Text extraction form

### Additional Hooks
1. **useQuoteExport** - Export quotes to various formats
2. **useQuoteHistory** - Track search history
3. **useKeyboardShortcuts** - Keyboard navigation

### Additional Utilities
1. **export.ts** - Export to JSON/CSV/PDF
2. **validation.ts** - Input validation helpers
3. **formatting.ts** - Date/text formatting helpers

## 🧪 Testing Strategy

Now that the code is modular, you can easily test:

1. **Hooks** - Test in isolation with React Testing Library
2. **Utilities** - Pure function unit tests
3. **Components** - Component integration tests
4. **E2E** - Full app flow tests with Playwright/Cypress

## 📝 Migration Notes

- Original App.tsx backed up as `App-Old-Backup.tsx`
- All functionality preserved
- No breaking changes to UI/UX
- localStorage keys unchanged (backwards compatible)

## 🎓 Usage Example

```typescript
// Before: Everything in App.tsx
const App = () => {
  const [quotes, setQuotes] = useState([]);
  const [apiKey, setApiKey] = useState('');
  // ... 20 more useState hooks
  // ... 12 handler functions
  // ... 400+ lines of JSX
};

// After: Clean and modular
const App = () => {
  const { user, handleLogout } = useAuth();
  const { apiKey, selectedAI, getCurrentApiKey } = useApiKeys();
  const { quotes, handleSearch } = useQuotes();
  const { filteredAndSortedQuotes } = useQuoteFilters(quotes);
  
  // Clean, focused component logic
  return <div>...</div>;
};
```

## 🔄 Backwards Compatibility

- All localStorage keys remain the same
- API contracts unchanged
- UI/UX identical to previous version
- No data migration required

---

**Result**: A more maintainable, testable, and scalable codebase! 🎉
