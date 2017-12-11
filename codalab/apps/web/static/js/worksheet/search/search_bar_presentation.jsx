import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Search, Label } from 'semantic-ui-react';
import mouseTrap from 'react-mousetrap';
import update from 'immutability-helper';
import { clFetch } from '../utils.jsx';


// TODO merge search_bar and search_bar_presentation
const ClSearch = styled(Search)`
  z-index:1000;
`;

// TODO do we need to click out of this element? Why all the custom code for it?
class SearchBarPresentationComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    this.setWrapperRef = this.setWrapperRef.bind(this);           
    this.handleClickOutside = this.handleClickOutside.bind(this);
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside);
    this.props.bindShortcut('/', (e) => {
      document.getElementById("cl-search").focus();
      e.preventDefault();
    });
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }

	/**
	 * Set the wrapper ref
	 */
	setWrapperRef(node) {
		this.wrapperRef = node;
	}

	/**
	 * Alert if clicked on outside of element
	 */
	handleClickOutside(event) {
	  if (this.wrapperRef && !this.wrapperRef.contains(event.target)) {
      this.setState({
        open: false
      });
	  }
	}

  render() {
    let me = this;
    const onResultSelect = (e, selected) => {
      this.props.onResultSelect(e, selected);
      e.preventDefault();
      me.setState({
        open: true
      });
    };

    const onSearchChange = (e, { value }) => {
      this.props.onInputChange(value);
    };

    const stayOpen = this.state.open;
    
    return (
      <div ref={this.setWrapperRef}>
        <ClSearch
          id="cl-search"
          results={this.props.results}
          loading={this.props.isLoading}
          onSearchChange={onSearchChange}
          onResultSelect={onResultSelect}
          category={this.props.isCategories}
          value={this.props.inputText}
          open={stayOpen ? stayOpen : undefined}
          input={{fluid: true}}
          fluid={true}
        />
      </div>
    );
  }
}

SearchBarPresentationComponent.propTypes = {
  results: PropTypes.oneOfType([
    PropTypes.arrayOf(
      PropTypes.shape({
        title: PropTypes.string,
        id: PropTypes.string,
      })
    ),
    PropTypes.object,
  ]),
  isCategories: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  inputText: PropTypes.string.isRequired,
  onInputChange: PropTypes.func.isRequired,
  onResultSelect: PropTypes.func.isRequired,
};

let SearchBarPresentation = mouseTrap(SearchBarPresentationComponent);

/**
 * State initial:
 * {
 *   currentQuery: "",
 *   bundles: {},
 *   worksheets: {},
 *   users: {},
 * }
 *
 * User types something into the search bar.
 *
 * First, the currentQuery is updated, before any of
 * the fetches are executed:
 * {
 *   currentQuery: "m",
 *   bundles: {},
 *   worksheets: {},
 *   users: {},
 * }
 *
 * Then the clFetch() calls are made (see `clFetch`
 * documentation). Remember that these occur
 * asynchronously. One possible resulting state,
 * assuming both clFetch() statements have been
 * called but the results have not arrived from
 * the server yet:
 * {
 *   currentQuery: "m",
 *   bundles: {
 *     "m": {
 *       isFetching: true,
 *       context: {
 *         inputText: "m"
 *       }
 *     }
 *   },
 *   worksheets: {
 *     "m": {
 *       isFetching: true,
 *       context: {
 *         inputText: "m"
 *       }
 *     }
 *   },
 *   users: {
 *     "m": {
 *       isFetching: true,
 *       context: {
 *         inputText: "m"
 *       }
 *     }
 *   }
 * }
 *
 * Once the fetch calls both returns results, the state
 * would be:
 *
 * {
 *   currentQuery: "m",
 *   bundles: {
 *     "m": {
 *       isFetching: false,
 *       results: {
 *         data: [...],
 *         meta: {...},
 *       },
 *       context: {
 *         inputText: "m"
 *       }
 *     }
 *   },
 *   worksheets: {
 *     "m": {
 *       isFetching: false,
 *       results: {
 *         data: [...],
 *         meta: {...},
 *       },
 *       context: {
 *         inputText: "m"
 *       }
 *     }
 *   },
 *   users: {
 *     "m": {
 *       isFetching: false,
 *       results: {
 *         data: [...],
 *         meta: {...},
 *       },
 *       context: {
 *         inputText: "m"
 *       }
 *     }
 *   }
 * }
 *
 */
class SearchBar extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      currentQuery: "",
      bundles: {},
      worksheets: {},
      users: {},
    };

    this.onResultSelect = this.onResultSelect.bind(this);
    this.onInputChange = this.onInputChange.bind(this);
  }

  onInputChange(inputText) {
    const self = this;

    this.setState(update(this.state, {
      currentQuery: {
        $set: inputText,
      }
    }));

    // TODO add docs
    function convertInputToKeywordQueryString(input) {
      let keywordsQuery;
      // remove leading / trailing whitespace, split
      // by any whitespace
      keywordsQuery = input.trim().split(/[ ]+/);
      keywordsQuery.push(".limit=5");
      let keywordsQueryString = keywordsQuery.reduce((accumulated, cur) => {
        return accumulated + `keywords=${encodeURIComponent(cur)}` + '&';
      }, '');
      return keywordsQueryString;
    }

    let keywordQueryString = convertInputToKeywordQueryString(inputText);

    const setState = (updater, callback) =>
      self.setState(updater, callback);

    clFetch({
      url: `/rest/bundles?${keywordQueryString}`,
      setState,
      key: ['bundles', inputText],
      context: { inputText },
    });

    clFetch({
      url: `/rest/worksheets?${keywordQueryString}`,
      setState,
      key: ['worksheets', inputText],
      context: { inputText },
    });

    clFetch({
      url: `/rest/users?${keywordQueryString}`,
      setState,
      key: ['users', inputText],
      context: { inputText },
    });
  }

  /**
   * e : SyntheticEvent : React synthetic event object.
   * selected : JSON : the JSON represention of the selected result
   */
  onResultSelect(e, selected) {
    const type = selected.result.type;

    switch (type) {
      case 'worksheet':
        window.location.href = `/worksheets/${selected.result.id}`;
        break;
      case 'bundle':
        window.location.href = `/bundles/${selected.result.id}`;
        break;
      case 'user':
        window.location.href = `/account/user_profile/${selected.result.id}`;
        break;
      case 'filter':
        this.onInputChange(`${select.value} ${selected.result.key}`);
        break;
      default:
        return;
    }
  }

  render() {
    let {currentQuery, bundles, worksheets, users} = this.state;

    const hasLoaded = (state) => {
      let {currentQuery, bundles, worksheets, users} = state;
      if (currentQuery === '') return true;
      return hasResultsLoaded(state);
    }

    const hasResultsLoaded = (state) => {
      let {currentQuery, bundles, worksheets, users} = state;
      return (bundles[currentQuery] && !bundles[currentQuery].isFetching) && 
        (worksheets[currentQuery] && !worksheets[currentQuery].isFetching) &&
        (users[currentQuery] && !users[currentQuery].isFetching);
    }

    let results = {};
    if (hasResultsLoaded(this.state)) {
      let worksheetsResults = worksheets[currentQuery].results;
      if (worksheetsResults.data.length > 0) {
        results['worksheets'] = {
          name: 'Worksheets',
          results: worksheetsResults.data.map((item) => {
            let description = item.attributes.title ?
              `Title: ${item.attributes.title}` :
              '';

            return {
              id: item.attributes.uuid,
              title: item.attributes.name,
              description,
              key: item.attributes.uuid,
              type: 'worksheet',
            };
          })
        };
      }

      let bundleResults = bundles[currentQuery].results;
      if (bundleResults.data.length > 0) {
        results['bundles'] = {
          name: 'Bundles',
          results: bundleResults.data.map((item) => {
            let description = item.attributes.command ?
              `command: ${item.attributes.command}` :
              '';
            return {
              id: item.attributes.uuid,
              title: item.attributes.metadata.name,
              description,
              key: item.attributes.uuid,
              type: 'bundle',
            }
          })
        }
      }

      let userResults = users[currentQuery].results;
      if (userResults.data.length > 0) {
        results['users'] = {
          name: 'Users',
          results: userResults.data.map((item) => {
            return {
              id: item.attributes.user_name,
              title: item.attributes.user_name,
              key: item.id,
              type: 'user',
            };
          })
        }
      }
    }

    results['filters'] = {
      name: 'Filter results',
      results: [
        {
          renderer: ({ title, description }) => {
            return (
              <div>
                <Label content={title} />
                <span style={{marginLeft: '5px'}}>
                  {description}
                </span>
              </div>
            );
          },
          id: 'mine',
          title: '.mine',
          type: 'filter',
          key: '.mine',
          description: 'Search only for items that I own',
        },
      ]
    };
    
    return (
      <SearchBarPresentation
        results={results}
        isCategories={true}
        isLoading={!hasLoaded(this.state)}
        inputText={this.state.currentQuery}
        onInputChange={this.onInputChange}
        onResultSelect={this.onResultSelect}
      />
    );
  }
}

export {
  SearchBarPresentation,
  SearchBar
};
