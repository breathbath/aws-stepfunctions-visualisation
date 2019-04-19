import React from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { Graphviz } from 'graphviz-react';
import Typography from '@material-ui/core/Typography';
import CustomError from './CustomError';
import StateCard from './StateCard';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import { CardContent } from '@material-ui/core';
import { fetchAwsWithErrorHandling } from '../components/AwsFetcher';

const styles = theme => ({
  graphContent: {
    width: '100%',
    overflow: 'auto',
  },
  svg: {
    overflow: 'auto',
  }
});

class Graph extends React.Component {
  graphFormat = 'digraph  { %defaultStyles %nodeStyles %edges}';
  defaultStylesFormat = 'node [shape="box"]';
  startEndNodeStyleFormat = '%node [shape="circle", id="%id", fillcolor="%color", style="filled"]';
  defaultNodeStyleFormat = '%node [shape="box", URL="%url", id="%id"]';
  failedNodeStyleFormat = '%node [shape="box", URL="%url", id="%id", style=dashed]';
  filledNodeStyleFormat = '%node [fillcolor="%color", shape="box", URL="%url", style="filled", id="%id"]';
  edgeFormat = '%node1 -> %node2';
  dottedEdgeFormat = '%node1 -> %node2[style=dashed, color=red]';

  constructor(props) {
    super(props);
    this.clss = props.classes;
    this.stateMachineArn = props.stateMachineArn;
    this.executionArn = props.executionArn;
    this.state = {
      error: null,
      isLoaded: false,
      stateMachineDefinition: {
        'Comment': '',
        'StartAt': '',
        'States': []
      },
      historyEvents: [],
    };
    this.handleClick = this.handleClick.bind(this);
    this.stateCard = React.createRef({classes: props.classes});
    this.stateHistoryMap = {};
  }

  componentDidMount() {
    let def = {};
    fetchAwsWithErrorHandling(
      "DescribeStateMachine",
      {
        stateMachineArn: this.stateMachineArn
      },
      this,
      (result) => {
        if (!result.definition) {
          return "Invalid server response, missing 'definition' key in DescribeStateMachine action output";
        }
        try {
          def = JSON.parse(result.definition);
        } catch (e) {
          return "Invalid server response, invalid json format at 'definition' key in DescribeStateMachine action output: " + e.message;
        }

        fetchAwsWithErrorHandling(
          "GetExecutionHistory",
          {
            executionArn: this.executionArn,
            maxResults: 1000
          },
          this,
          (result) => {
            if (!result.events) {
              return "Invalid server response, missing 'events' key in GetExecutionHistory action output";
            }
            this.setState({
              isLoaded: true,
              stateMachineDefinition: def,
              historyEvents: result.events,
            });
          }
        )
      }
    )
  }

  handleClick(e) {
    if (!e.target || !e.target.parentNode || e.target.parentNode.nodeName !== "a") {
      return;
    }
    let currentStateName = e.target.parentNode.getAttribute("title");
    let currentStateObj = this.stateHistoryMap[currentStateName];
    if (!currentStateObj) {
      return;
    }
    e.preventDefault();
    this.stateCard.current.setCurrentSmState(currentStateObj);
  }

  buildStatesGraph(states, nodeStyles, edges, startStateName, endStateName, entryPointStateName) {
    edges.push(this.edgeFormat.replace("%node1", startStateName).replace("%node2", entryPointStateName));

    let state = {};
    for (var stateId in states) {
      if (!states.hasOwnProperty(stateId)) {
        continue;
      }
      state = states[stateId];
      this.stateHistoryMap[stateId] = {};
      let nodeStyleFormat = this.defaultNodeStyleFormat;
      if (state.Next && state.Type !== "Parallel") {
        edges.push(this.edgeFormat.replace("%node1", stateId).replace("%node2", state.Next));
      }
      if (state.Catch && state.Catch.length > 0) {
        nodeStyleFormat = this.failedNodeStyleFormat;
        for (let k = 0; k < state.Catch.length; k++) {
          let curCatch = state.Catch[k];
          if (!curCatch.Next) {
            continue;
          }
          edges.push(this.dottedEdgeFormat.replace("%node1", stateId).replace("%node2", curCatch.Next));
        }
      }

      if (state.Type === "Succeed" || state.End) {
        edges.push(this.edgeFormat.replace("%node1", stateId).replace("%node2", endStateName));
      } else if (state.Type === "Fail") {
        nodeStyleFormat = this.failedNodeStyleFormat;
        edges.push(this.dottedEdgeFormat.replace("%node1", stateId).replace("%node2", endStateName));
      } else if (state.Type === "Parallel") {
        for (var branchStateIndex in state.Branches) {
          let subStateMachine = state.Branches[branchStateIndex];
          this.buildStatesGraph(subStateMachine.States, nodeStyles, edges, stateId, state.Next, subStateMachine.StartAt);
        }
      }

      nodeStyles.push(
        nodeStyleFormat.replace("%node", stateId)
          .replace("%url", "/sm/" + this.stateMachineArn + "/e/" + this.executionArn + "/state/" + stateId)
          .replace("%id", stateId)
      );
    }
  }

  render() {
    const { error, isLoaded, stateMachineDefinition, historyEvents } = this.state;

    if (error) {
      return <CustomError Title="Exception" Title2="Sometheing went wrong :(" Text={error} />;
    }

    if (!stateMachineDefinition.StartAt) {
      return <CustomError Title="Exception" Title2="Wrong State Machine" Text="Empty State Machine definition" />;
    }

    if (!isLoaded) {
      return <div className={this.clss.progressContainer}><CircularProgress className={this.clss.progress} /></div>;
    }

    let comment = null;
    if (stateMachineDefinition.Comment) {
      comment = <Typography variant="h6" align="center" gutterBottom> {stateMachineDefinition.Comment}</Typography>;
    }

    if (stateMachineDefinition.States.length === 0) {
      return (<div>{comment}</div>);
    }

    let dGraph = this.graphFormat.replace("%defaultStyles", this.defaultStylesFormat);
    let nodeStyles = [];
    let edges = [];

    nodeStyles.push(
      this.startEndNodeStyleFormat.replace("%node", 'Start')
        .replace("%color", 'orange')
        .replace("%id", 'Start')
    );

    nodeStyles.push(
      this.startEndNodeStyleFormat.replace("%node", 'End')
        .replace("%color", 'orange')
        .replace("%id", 'End')
    );
    this.buildStatesGraph(stateMachineDefinition.States, nodeStyles, edges, 'Start', 'End', stateMachineDefinition.StartAt)

    let lastExitedStateName = '';
    for (let k = 0; k < historyEvents.length; k++) {
      let historyEvent = historyEvents[k];
      if (historyEvent.type.endsWith("StateEntered") && historyEvent.stateEnteredEventDetails.name && this.stateHistoryMap[historyEvent.stateEnteredEventDetails.name]) {
        let stateUrl = "/sm/" + this.stateMachineArn + "/e/" + this.executionArn + "/state/" + historyEvent.stateEnteredEventDetails.name;
        nodeStyles.push(this.filledNodeStyleFormat.replace("%node", historyEvent.stateEnteredEventDetails.name)
          .replace("%color", "green")
          .replace("%url", stateUrl)
          .replace("%id", historyEvent.stateEnteredEventDetails.name)
        );
        this.stateHistoryMap[historyEvent.stateEnteredEventDetails.name]['input'] = historyEvent;
      }

      if (historyEvent.type.endsWith("StateExited") && historyEvent.stateExitedEventDetails.name && this.stateHistoryMap[historyEvent.stateExitedEventDetails.name]) {
        lastExitedStateName = historyEvent.stateExitedEventDetails.name;
        this.stateHistoryMap[historyEvent.stateExitedEventDetails.name]['output'] = historyEvent;
      }

      if (historyEvent.type === "ExecutionFailed" && lastExitedStateName) {
        nodeStyles.push(this.filledNodeStyleFormat.replace("%node", lastExitedStateName).replace("%color", "red"));
        lastExitedStateName = "";
        continue;
      }
    }

    dGraph = dGraph.replace("%nodeStyles", nodeStyles.join(' '));
    dGraph = dGraph.replace("%edges", edges.join(' '));

    let currentStateObj = this.stateHistoryMap[this.props.stateId];

    return (
      <Grid container spacing={16}>
        <Grid item xs>
          <Card className={this.clss.graphContent}>
            <CardContent>
              <div onClick={this.handleClick}>{comment}<Graphviz dot={dGraph} options={{ fit: true, width: "600", height:"800",scale:1}} /></div>
            </CardContent>
          </Card>
        </Grid>
        <StateCard ref={this.stateCard} currentStateObj={currentStateObj} />
      </Grid>
    );
  }
}

Graph.propTypes = {
  classes: PropTypes.object.isRequired,
  stateMachineArn: PropTypes.string.isRequired,
};

export default withStyles(styles)(Graph);