import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Cookie from "js-cookie";
import { PaginatedVirtualListRef } from "components/PaginatedVirtualList/types";
import {
  CASE_SENSITIVE,
  EXPANDABLE_ROWS,
  FILTER_LOGIC,
  PRETTY_PRINT_BOOKMARKS,
  WRAP,
} from "constants/cookies";
import { FilterLogic, LogTypes } from "constants/enums";
import { QueryParams } from "constants/queryParams";
import { useFilterParam } from "hooks/useFilterParam";
import { useQueryParam, useQueryParams } from "hooks/useQueryParam";
import { ExpandedLines, ProcessedLogLines } from "types/logs";
import filterLogs from "utils/filterLogs";
import { getMatchingLines } from "utils/matchingLines";
import { getColorMapping } from "utils/resmoke";
import searchLogs from "utils/searchLogs";
import useLogState from "./state";
import { DIRECTION, LogMetadata, Preferences, SearchState } from "./types";
import { getNextPage } from "./utils";

interface LogContextState {
  expandedLines: ExpandedLines;
  hasLogs: boolean;
  lineCount: number;
  listRef: React.RefObject<PaginatedVirtualListRef>;
  logMetadata?: LogMetadata;
  matchingLines: Set<number> | undefined;
  preferences: Preferences;
  processedLogLines: ProcessedLogLines;
  range: {
    lowerRange: number;
    upperRange?: number;
  };
  searchLine?: number;
  searchState: SearchState;

  clearExpandedLines: () => void;
  clearLogs: () => void;
  collapseLines: (idx: number) => void;
  expandLines: (expandedLines: ExpandedLines) => void;
  getLine: (lineNumber: number) => string | undefined;
  getResmokeLineColor: (lineNumber: number) => string | undefined;
  ingestLines: (logs: string[], logType: LogTypes) => void;
  paginate: (dir: DIRECTION) => void;
  scrollToLine: (lineNumber: number) => void;
  setFileName: (fileName: string) => void;
  setLogMetadata: (logMetadata: LogMetadata) => void;
  setSearch: (search: string) => void;
}

const LogContext = createContext<LogContextState | null>(null);

const useLogContext = () => {
  const context = useContext(LogContext);
  if (context === undefined) {
    throw new Error("useLogContext must be used within a LogContextProvider");
  }
  return context as LogContextState;
};

interface LogContextProviderProps {
  children: React.ReactNode;
  initialLogLines?: string[];
}

const LogContextProvider: React.FC<LogContextProviderProps> = ({
  children,
  initialLogLines,
}) => {
  const [searchParams, setSearchParams] = useQueryParams();
  const [filters] = useFilterParam();
  const [bookmarks] = useQueryParam<number[]>(QueryParams.Bookmarks, []);
  const [shareLine] = useQueryParam<number | undefined>(
    QueryParams.ShareLine,
    undefined
  );
  const [selectedLine] = useQueryParam<number | undefined>(
    QueryParams.SelectedLine,
    undefined
  );
  const [lowerRange] = useQueryParam(QueryParams.LowerRange, 0);
  const [upperRange] = useQueryParam<undefined | number>(
    QueryParams.UpperRange,
    undefined
  );

  const [wrap, setWrap] = useState(Cookie.get(WRAP) === "true");
  const [filterLogic, setFilterLogic] = useQueryParam(
    QueryParams.FilterLogic,
    (Cookie.get(FILTER_LOGIC) as FilterLogic) ?? FilterLogic.And
  );
  const [expandableRows, setExpandableRows] = useQueryParam(
    QueryParams.Expandable,
    Cookie.get(EXPANDABLE_ROWS) ? Cookie.get(EXPANDABLE_ROWS) === "true" : true
  );
  const [prettyPrint, setPrettyPrint] = useState(
    Cookie.get(PRETTY_PRINT_BOOKMARKS) === "true"
  );

  const { state, dispatch } = useLogState(initialLogLines);
  const [processedLogLines, setProcessedLogLines] = useState<ProcessedLogLines>(
    []
  );
  const listRef = useRef<PaginatedVirtualListRef>(null);

  const stringifiedFilters = JSON.stringify(filters);
  const stringifiedBookmarks = bookmarks.toString();
  const stringifiedExpandedLines = state.expandedLines.toString();

  const matchingLines = useMemo(
    () => getMatchingLines(state.logs, filters, filterLogic),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      stringifiedFilters,
      stringifiedExpandedLines,
      state.logs.length,
      filterLogic,
    ]
  );

  useEffect(
    () => {
      setProcessedLogLines(
        filterLogs({
          logLines: state.logs,
          matchingLines,
          bookmarks,
          shareLine,
          expandedLines: state.expandedLines,
          expandableRows,
        })
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      state.logs.length,
      matchingLines,
      stringifiedBookmarks,
      shareLine,
      stringifiedExpandedLines,
      expandableRows,
    ]
  );

  // If selectedLine is in the URL, replace it with shareLine.
  // This block of code can be deleted in EVG-18748.
  useEffect(() => {
    if (selectedLine) {
      setSearchParams({
        ...searchParams,
        shareLine: selectedLine,
        selectedLine: undefined,
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getLine = useCallback(
    (lineNumber: number) => state.logs[lineNumber],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.logs.length]
  );

  const getResmokeLineColor = useCallback(
    (lineNumber: number) => {
      const lineContent = getLine(lineNumber);
      if (!state.colorMapping || !lineContent) {
        return undefined;
      }
      const colorMapping = getColorMapping(lineContent, state.colorMapping);
      return colorMapping !== undefined ? colorMapping.color : undefined;
    },
    [getLine, state.colorMapping]
  );

  const scrollToLine = useCallback((lineNumber: number) => {
    listRef.current?.scrollToIndex(lineNumber);
  }, []);

  const searchResults = useMemo(() => {
    const results = state.searchState.searchTerm
      ? searchLogs({
          searchRegex: state.searchState.searchTerm,
          processedLogLines,
          upperBound: upperRange,
          lowerBound: lowerRange,
          getLine,
        })
      : [];
    dispatch({
      type: "SET_MATCH_COUNT",
      matchCount: results.length,
    });

    return results;
  }, [
    state.searchState.searchTerm,
    processedLogLines,
    upperRange,
    lowerRange,
    getLine,
    dispatch,
  ]);

  const stringifiedSearchResults = searchResults.toString();
  useEffect(() => {
    if (searchResults.length > 0) {
      scrollToLine(searchResults[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stringifiedSearchResults, scrollToLine]);

  const searchLine =
    state.searchState.searchIndex !== undefined
      ? searchResults[state.searchState.searchIndex]
      : undefined;

  const ingestLines = useCallback(
    (lines: string[], logType: LogTypes) => {
      dispatch({ type: "INGEST_LOGS", logs: lines, logType });
    },
    [dispatch]
  );

  const setLogMetadata = useCallback(
    (logMetadata: LogMetadata) => {
      dispatch({ type: "SET_LOG_METADATA", logMetadata });
    },
    [dispatch]
  );
  const memoizedContext = useMemo(
    () => ({
      expandedLines: state.expandedLines,
      hasLogs: !!processedLogLines.length,
      lineCount: state.logs.length,
      logMetadata: state.logMetadata,
      matchingLines,
      listRef,
      preferences: {
        caseSensitive: state.searchState.caseSensitive,
        expandableRows,
        filterLogic,
        prettyPrint,
        wrap,
        setCaseSensitive: (v: boolean) => {
          dispatch({ type: "SET_CASE_SENSITIVE", caseSensitive: v });
          Cookie.set(CASE_SENSITIVE, v.toString(), { expires: 365 });
        },
        setExpandableRows: (v: boolean) => {
          setExpandableRows(v);
          Cookie.set(EXPANDABLE_ROWS, v.toString(), { expires: 365 });
        },
        setFilterLogic: (v: FilterLogic) => {
          setFilterLogic(v);
          Cookie.set(FILTER_LOGIC, v, { expires: 365 });
        },
        setPrettyPrint: (v: boolean) => {
          setPrettyPrint(v);
          Cookie.set(PRETTY_PRINT_BOOKMARKS, v.toString(), { expires: 365 });
        },
        setWrap: (v: boolean) => {
          setWrap(v);
          Cookie.set(WRAP, v.toString(), { expires: 365 });
        },
      },
      processedLogLines,
      range: {
        lowerRange,
        upperRange,
      },
      searchLine,
      searchState: state.searchState,

      clearExpandedLines: () => dispatch({ type: "CLEAR_EXPANDED_LINES" }),
      clearLogs: () => dispatch({ type: "CLEAR_LOGS" }),
      collapseLines: (idx: number) => dispatch({ type: "COLLAPSE_LINES", idx }),
      expandLines: (expandedLines: ExpandedLines) =>
        dispatch({ type: "EXPAND_LINES", expandedLines }),
      getLine,
      getResmokeLineColor,
      ingestLines,
      paginate: (direction: DIRECTION) => {
        const { searchIndex, searchRange } = state.searchState;
        if (searchIndex !== undefined && searchRange !== undefined) {
          const nextPage = getNextPage(searchIndex, searchRange, direction);
          dispatch({ type: "PAGINATE", nextPage });
          scrollToLine(searchResults[nextPage]);
        }
      },
      scrollToLine,
      setFileName: (fileName: string) => {
        dispatch({ type: "SET_FILE_NAME", fileName });
      },
      setLogMetadata,
      setSearch: (searchTerm: string) => {
        dispatch({ type: "SET_SEARCH_TERM", searchTerm });
      },
    }),
    [
      expandableRows,
      filterLogic,
      lowerRange,
      matchingLines,
      prettyPrint,
      processedLogLines,
      searchLine,
      searchResults,
      state.expandedLines,
      state.logMetadata,
      state.logs.length,
      state.searchState,
      upperRange,
      wrap,
      dispatch,
      getLine,
      getResmokeLineColor,
      ingestLines,
      scrollToLine,
      setExpandableRows,
      setFilterLogic,
      setLogMetadata,
    ]
  );

  return (
    <LogContext.Provider value={memoizedContext}>
      {children}
    </LogContext.Provider>
  );
};

export { LogContextProvider, useLogContext };
