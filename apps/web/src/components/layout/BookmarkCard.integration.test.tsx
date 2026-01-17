/**
 * Bookmark Navigation Integration Tests
 *
 * Tests the complete bookmark workflow from creation to navigation
 * with entity-based storage and backward compatibility for existing bookmarks.
 */

import { InMemoryStorageProvider } from '@bibgraph/utils'
import type { CatalogueEntity } from '@bibgraph/utils/storage/catalogue-db'
import { SPECIAL_LIST_IDS } from '@bibgraph/utils/storage/catalogue-db'
import { MantineProvider } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BookmarkCard } from '@/components/layout/BookmarkCard'
import { StorageProviderWrapper } from '@/contexts/storage-provider-context'
import { useUserInteractions } from '@/hooks/user-interactions'

// Mock the hook to provide controlled test data
vi.mock('@/hooks/user-interactions')
const mockUseUserInteractions = vi.mocked(useUserInteractions)

// Mock navigation
const mockNavigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: '/bookmarks',
    search: '',
    hash: '',
    state: null,
    key: 'test'
  }),
  Link: ({ children, to, ...props }: any) => (
    <a href={to} {...props} onClick={() => mockNavigate(to)}>
      {children}
    </a>
  )
}))

// Shared storage provider for tests
let testStorage: InMemoryStorageProvider

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <StorageProviderWrapper provider={testStorage}>
        <MantineProvider>
          {children}
        </MantineProvider>
      </StorageProviderWrapper>
    </QueryClientProvider>
  )
}

describe('Bookmark Navigation Integration Tests', () => {
  const mockBookmark: CatalogueEntity = {
    id: 'bookmark-123',
    listId: SPECIAL_LIST_IDS.BOOKMARKS,
    entityType: 'works',
    entityId: 'W1234567890',
    notes: 'Important research paper on AI',
    addedAt: new Date('2024-01-15T10:30:00Z'),
    position: 0
  }

  const mockLegacyBookmark: CatalogueEntity = {
    id: 'bookmark-456',
    listId: SPECIAL_LIST_IDS.BOOKMARKS,
    entityType: 'works',
    entityId: 'unknown', // Legacy bookmarks may not have proper entityId
    notes: 'Legacy bookmark with URL\n\nURL: https://mearman.github.io/BibGraph/works/W987654321',
    addedAt: new Date('2024-01-10T14:20:00Z'),
    position: 1
  }

  const mockDOIBookmark: CatalogueEntity = {
    id: 'bookmark-789',
    listId: SPECIAL_LIST_IDS.BOOKMARKS,
    entityType: 'works',
    entityId: '10.1038/nature12345',
    notes: 'Nature journal article',
    addedAt: new Date('2024-01-12T09:15:00Z'),
    position: 2
  }

  const mockORCIDBookmark: CatalogueEntity = {
    id: 'bookmark-orcid',
    listId: SPECIAL_LIST_IDS.BOOKMARKS,
    entityType: 'authors',
    entityId: '0000-0002-1825-0097',
    notes: 'Notable AI researcher',
    addedAt: new Date('2024-01-18T16:45:00Z'),
    position: 3
  }

  beforeEach(async () => {
    mockNavigate.mockClear()
    vi.clearAllMocks()

    // Initialize storage provider for each test
    testStorage = new InMemoryStorageProvider()
    await testStorage.initializeSpecialLists()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('New Entity-Based Bookmarks', () => {
    it('should navigate to work entity using entity-based reconstruction', async () => {
      const mockUnbookmark = vi.fn().mockResolvedValue(undefined)

      mockUseUserInteractions.mockReturnValue({
        isBookmarked: true,
        unbookmarkEntity: mockUnbookmark,
        updateBookmark: vi.fn().mockResolvedValue(undefined),
        refreshData: vi.fn().mockResolvedValue(undefined),
        bulkRemoveBookmarks: vi.fn().mockResolvedValue({ success: 1, failed: 0 }),
        clearHistory: vi.fn().mockResolvedValue(undefined),
        recordPageVisit: vi.fn().mockResolvedValue(undefined),
        recentHistory: [],
        historyStats: { totalVisits: 0, uniqueEntities: 0, byType: {} },
        bookmarks: [mockBookmark],
        bookmarkEntity: vi.fn().mockResolvedValue(undefined),
        bookmarkSearch: vi.fn().mockResolvedValue(undefined),
        bookmarkList: vi.fn().mockResolvedValue(undefined),
        unbookmarkSearch: vi.fn().mockResolvedValue(undefined),
        unbookmarkList: vi.fn().mockResolvedValue(undefined),
        searchBookmarks: vi.fn().mockResolvedValue([]),
        isLoadingHistory: false,
        isLoadingBookmarks: false,
        isLoadingStats: false
      } as any)

      render(
        <TestWrapper>
          <BookmarkCard bookmark={mockBookmark} />
        </TestWrapper>
      )

      // Check bookmark content is displayed
      expect(screen.getByText(/Important research paper on AI/)).toBeInTheDocument()
      expect(screen.getByText('works')).toBeInTheDocument()

      // Click the bookmark to navigate
      const bookmarkLink = screen.getByRole('link', { name: /Important research paper on AI/ })
      fireEvent.click(bookmarkLink)

      // Should navigate to entity-based URL
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/works/W1234567890')
      })
    })

    it('should handle DOI-based work bookmarks correctly', async () => {
      const mockUnbookmark = vi.fn().mockResolvedValue(undefined)

      mockUseUserInteractions.mockReturnValue({
        isBookmarked: true,
        unbookmarkEntity: mockUnbookmark,
        updateBookmark: vi.fn().mockResolvedValue(undefined),
        refreshData: vi.fn().mockResolvedValue(undefined),
        bulkRemoveBookmarks: vi.fn().mockResolvedValue({ success: 1, failed: 0 }),
        clearHistory: vi.fn().mockResolvedValue(undefined),
        recordPageVisit: vi.fn().mockResolvedValue(undefined),
        recentHistory: [],
        historyStats: { totalVisits: 0, uniqueEntities: 0, byType: {} },
        bookmarks: [mockDOIBookmark],
        bookmarkEntity: vi.fn().mockResolvedValue(undefined),
        bookmarkSearch: vi.fn().mockResolvedValue(undefined),
        bookmarkList: vi.fn().mockResolvedValue(undefined),
        unbookmarkSearch: vi.fn().mockResolvedValue(undefined),
        unbookmarkList: vi.fn().mockResolvedValue(undefined),
        searchBookmarks: vi.fn().mockResolvedValue([]),
        isLoadingHistory: false,
        isLoadingBookmarks: false,
        isLoadingStats: false
      } as any)

      render(
        <TestWrapper>
          <BookmarkCard bookmark={mockDOIBookmark} />
        </TestWrapper>
      )

      // Check DOI bookmark content
      expect(screen.getByText(/Nature journal article/)).toBeInTheDocument()

      // Click to navigate
      const bookmarkLink = screen.getByRole('link', { name: /Nature journal article/ })
      fireEvent.click(bookmarkLink)

      // Should navigate to DOI-based URL
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/doi/10.1038/nature12345')
      })
    })

    it('should handle ORCID-based author bookmarks correctly', async () => {
      const mockUnbookmark = vi.fn().mockResolvedValue(undefined)

      mockUseUserInteractions.mockReturnValue({
        isBookmarked: true,
        unbookmarkEntity: mockUnbookmark,
        updateBookmark: vi.fn().mockResolvedValue(undefined),
        refreshData: vi.fn().mockResolvedValue(undefined),
        bulkRemoveBookmarks: vi.fn().mockResolvedValue({ success: 1, failed: 0 }),
        clearHistory: vi.fn().mockResolvedValue(undefined),
        recordPageVisit: vi.fn().mockResolvedValue(undefined),
        recentHistory: [],
        historyStats: { totalVisits: 0, uniqueEntities: 0, byType: {} },
        bookmarks: [mockORCIDBookmark],
        bookmarkEntity: vi.fn().mockResolvedValue(undefined),
        bookmarkSearch: vi.fn().mockResolvedValue(undefined),
        bookmarkList: vi.fn().mockResolvedValue(undefined),
        unbookmarkSearch: vi.fn().mockResolvedValue(undefined),
        unbookmarkList: vi.fn().mockResolvedValue(undefined),
        searchBookmarks: vi.fn().mockResolvedValue([]),
        isLoadingHistory: false,
        isLoadingBookmarks: false,
        isLoadingStats: false
      } as any)

      render(
        <TestWrapper>
          <BookmarkCard bookmark={mockORCIDBookmark} />
        </TestWrapper>
      )

      // Check ORCID bookmark content
      expect(screen.getByText(/Notable AI researcher/)).toBeInTheDocument()

      // Click to navigate
      const bookmarkLink = screen.getByRole('link', { name: /Notable AI researcher/ })
      fireEvent.click(bookmarkLink)

      // Should navigate to ORCID-based URL
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/authors/orcid/0000-0002-1825-0097')
      })
    })
  })

  describe('Backward Compatibility', () => {
    it('should handle legacy bookmarks with URLs in notes', async () => {
      const mockUnbookmark = vi.fn().mockResolvedValue(undefined)

      mockUseUserInteractions.mockReturnValue({
        isBookmarked: true,
        unbookmarkEntity: mockUnbookmark,
        updateBookmark: vi.fn().mockResolvedValue(undefined),
        refreshData: vi.fn().mockResolvedValue(undefined),
        bulkRemoveBookmarks: vi.fn().mockResolvedValue({ success: 1, failed: 0 }),
        clearHistory: vi.fn().mockResolvedValue(undefined),
        recordPageVisit: vi.fn().mockResolvedValue(undefined),
        recentHistory: [],
        historyStats: { totalVisits: 0, uniqueEntities: 0, byType: {} },
        bookmarks: [mockLegacyBookmark],
        bookmarkEntity: vi.fn().mockResolvedValue(undefined),
        bookmarkSearch: vi.fn().mockResolvedValue(undefined),
        bookmarkList: vi.fn().mockResolvedValue(undefined),
        unbookmarkSearch: vi.fn().mockResolvedValue(undefined),
        unbookmarkList: vi.fn().mockResolvedValue(undefined),
        searchBookmarks: vi.fn().mockResolvedValue([]),
        isLoadingHistory: false,
        isLoadingBookmarks: false,
        isLoadingStats: false
      } as any)

      render(
        <TestWrapper>
          <BookmarkCard bookmark={mockLegacyBookmark} />
        </TestWrapper>
      )

      // Check legacy bookmark content
      expect(screen.getByText(/Legacy bookmark with URL/)).toBeInTheDocument()

      // Click to navigate - should extract URL from notes
      const bookmarkLink = screen.getByRole('link', { name: /Legacy bookmark with URL/ })
      fireEvent.click(bookmarkLink)

      // Should navigate to extracted URL from notes
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/works/unknown')
      })
    })

    it('should handle mixed new and legacy bookmarks in the same list', async () => {
      const mockUnbookmark = vi.fn().mockResolvedValue(undefined)

      mockUseUserInteractions.mockReturnValue({
        isBookmarked: true,
        unbookmarkEntity: mockUnbookmark,
        updateBookmark: vi.fn().mockResolvedValue(undefined),
        refreshData: vi.fn().mockResolvedValue(undefined),
        bulkRemoveBookmarks: vi.fn().mockResolvedValue({ success: 2, failed: 0 }),
        clearHistory: vi.fn().mockResolvedValue(undefined),
        recordPageVisit: vi.fn().mockResolvedValue(undefined),
        recentHistory: [],
        historyStats: { totalVisits: 0, uniqueEntities: 0, byType: {} },
        bookmarks: [mockBookmark, mockLegacyBookmark],
        bookmarkEntity: vi.fn().mockResolvedValue(undefined),
        bookmarkSearch: vi.fn().mockResolvedValue(undefined),
        bookmarkList: vi.fn().mockResolvedValue(undefined),
        unbookmarkSearch: vi.fn().mockResolvedValue(undefined),
        unbookmarkList: vi.fn().mockResolvedValue(undefined),
        searchBookmarks: vi.fn().mockResolvedValue([]),
        isLoadingHistory: false,
        isLoadingBookmarks: false,
        isLoadingStats: false
      } as any)

      const { rerender } = render(
        <TestWrapper>
          <BookmarkCard bookmark={mockBookmark} />
        </TestWrapper>
      )

      // Test new bookmark navigation
      fireEvent.click(screen.getByRole('link'))
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/works/W1234567890')
      })

      // Reset navigation mock
      mockNavigate.mockClear()

      // Test legacy bookmark navigation
      rerender(
        <TestWrapper>
          <BookmarkCard bookmark={mockLegacyBookmark} />
        </TestWrapper>
      )

      fireEvent.click(screen.getByRole('link'))
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/works/unknown')
      })
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle bookmarks with missing entity data gracefully', () => {
      const incompleteBookmark: CatalogueEntity = {
        id: 'bookmark-incomplete',
        listId: SPECIAL_LIST_IDS.BOOKMARKS,
        entityType: 'works',
        entityId: '',
        notes: 'Incomplete bookmark',
        addedAt: new Date(),
        position: 0
      }

      mockUseUserInteractions.mockReturnValue({
        isBookmarked: false,
        unbookmarkEntity: vi.fn().mockResolvedValue(undefined),
        updateBookmark: vi.fn().mockResolvedValue(undefined),
        refreshData: vi.fn().mockResolvedValue(undefined),
        bulkRemoveBookmarks: vi.fn().mockResolvedValue({ success: 0, failed: 1 }),
        clearHistory: vi.fn().mockResolvedValue(undefined),
        recordPageVisit: vi.fn().mockResolvedValue(undefined),
        recentHistory: [],
        historyStats: { totalVisits: 0, uniqueEntities: 0, byType: {} },
        bookmarks: [incompleteBookmark],
        bookmarkEntity: vi.fn().mockResolvedValue(undefined),
        bookmarkSearch: vi.fn().mockResolvedValue(undefined),
        bookmarkList: vi.fn().mockResolvedValue(undefined),
        unbookmarkSearch: vi.fn().mockResolvedValue(undefined),
        unbookmarkList: vi.fn().mockResolvedValue(undefined),
        searchBookmarks: vi.fn().mockResolvedValue([]),
        isLoadingHistory: false,
        isLoadingBookmarks: false,
        isLoadingStats: false
      } as any)

      render(
        <TestWrapper>
          <BookmarkCard bookmark={incompleteBookmark} />
        </TestWrapper>
      )

      // Should still render the bookmark content
      expect(screen.getByText(/Incomplete bookmark/)).toBeInTheDocument()

      // Should not crash on navigation attempt
      const bookmarkLink = screen.getByRole('link')
      expect(() => fireEvent.click(bookmarkLink)).not.toThrow()
    })

    it('should handle malformed URLs in legacy bookmark notes', async () => {
      const malformedBookmark: CatalogueEntity = {
        id: 'bookmark-malformed',
        listId: SPECIAL_LIST_IDS.BOOKMARKS,
        entityType: 'works',
        entityId: 'unknown',
        notes: 'Malformed URL\n\nURL: not-a-valid-url',
        addedAt: new Date(),
        position: 0
      }

      mockUseUserInteractions.mockReturnValue({
        isBookmarked: true,
        unbookmarkEntity: vi.fn().mockResolvedValue(undefined),
        updateBookmark: vi.fn().mockResolvedValue(undefined),
        refreshData: vi.fn().mockResolvedValue(undefined),
        bulkRemoveBookmarks: vi.fn().mockResolvedValue({ success: 1, failed: 0 }),
        clearHistory: vi.fn().mockResolvedValue(undefined),
        recordPageVisit: vi.fn().mockResolvedValue(undefined),
        recentHistory: [],
        historyStats: { totalVisits: 0, uniqueEntities: 0, byType: {} },
        bookmarks: [malformedBookmark],
        bookmarkEntity: vi.fn().mockResolvedValue(undefined),
        bookmarkSearch: vi.fn().mockResolvedValue(undefined),
        bookmarkList: vi.fn().mockResolvedValue(undefined),
        unbookmarkSearch: vi.fn().mockResolvedValue(undefined),
        unbookmarkList: vi.fn().mockResolvedValue(undefined),
        searchBookmarks: vi.fn().mockResolvedValue([]),
        isLoadingHistory: false,
        isLoadingBookmarks: false,
        isLoadingStats: false
      } as any)

      render(
        <TestWrapper>
          <BookmarkCard bookmark={malformedBookmark} />
        </TestWrapper>
      )

      // Should still render the bookmark
      expect(screen.getByText(/Malformed URL/)).toBeInTheDocument()

      // Should not navigate on click due to malformed URL
      const bookmarkLink = screen.getByRole('link')
      fireEvent.click(bookmarkLink)

      // Should still attempt navigation to fallback URL
      expect(mockNavigate).toHaveBeenCalledWith('/works/unknown')
    })
  })

  describe('BibGraph.com Domain Configuration', () => {
    it('should use empty base path for bibgraph.com deployment', async () => {
      const mockUnbookmark = vi.fn().mockResolvedValue(undefined)

      mockUseUserInteractions.mockReturnValue({
        isBookmarked: true,
        unbookmarkEntity: mockUnbookmark,
        updateBookmark: vi.fn().mockResolvedValue(undefined),
        refreshData: vi.fn().mockResolvedValue(undefined),
        bulkRemoveBookmarks: vi.fn().mockResolvedValue({ success: 1, failed: 0 }),
        clearHistory: vi.fn().mockResolvedValue(undefined),
        recordPageVisit: vi.fn().mockResolvedValue(undefined),
        recentHistory: [],
        historyStats: { totalVisits: 0, uniqueEntities: 0, byType: {} },
        bookmarks: [mockBookmark],
        bookmarkEntity: vi.fn().mockResolvedValue(undefined),
        bookmarkSearch: vi.fn().mockResolvedValue(undefined),
        bookmarkList: vi.fn().mockResolvedValue(undefined),
        unbookmarkSearch: vi.fn().mockResolvedValue(undefined),
        unbookmarkList: vi.fn().mockResolvedValue(undefined),
        searchBookmarks: vi.fn().mockResolvedValue([]),
        isLoadingHistory: false,
        isLoadingBookmarks: false,
        isLoadingStats: false
      } as any)

      render(
        <TestWrapper>
          <BookmarkCard bookmark={mockBookmark} />
        </TestWrapper>
      )

      // Navigate and verify no base path is included (bibgraph.com is primary domain)
      const bookmarkLink = screen.getByRole('link')
      fireEvent.click(bookmarkLink)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/works/W1234567890')
        // Should NOT include /BibGraph prefix
        expect(mockNavigate).not.toHaveBeenCalledWith('/BibGraph/works/W1234567890')
      })
    })
  })
})