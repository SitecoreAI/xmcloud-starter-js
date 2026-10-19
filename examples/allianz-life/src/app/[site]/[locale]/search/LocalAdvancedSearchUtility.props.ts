import type { SearchEntry } from '../../../../components/allianz-search/search-rules.props';
import type { AdvancedSearchState } from './advanced-search-model';

export interface LocalAdvancedSearchUtilityProps {
  state: AdvancedSearchState;
  matches: SearchEntry[];
}
