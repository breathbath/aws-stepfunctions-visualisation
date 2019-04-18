import React from 'react';
import PropTypes from 'prop-types';
import { Graphviz } from 'graphviz-react';
import Typography from '@material-ui/core/Typography';
import CustomError from './CustomError';
import StateCard from './StateCard';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import { CardContent } from '@material-ui/core';
import { fetchAwsWithErrorHandling } from '../components/AwsFetcher';

class Graph extends React.Component {
  dGraphFormat = 'digraph  { %defaultStyles %nodeStyles %edges}';
  dDefaultStylesFormat = 'node [shape="box"]';
  startEndNodeStyleFormat = '%node [shape="circle", id="%id", fillcolor="%color", style="filled"]';
  dDefaultNodeStyleFormat = '%node [shape="box", URL="%url", id="%id"]';
  dFailedNodeStyleFormat = '%node [shape="box", URL="%url", id="%id", style=dashed]';
  dFilledNodeStyleFormat = '%node [fillcolor="%color", shape="box", URL="%url", style="filled", id="%id"]';
  dEdgeFormat = '%node1 -> %node2';
  dDottedEdgeFormat = '%node1 -> %node2[style=dashed, color=red]';

  constructor(props) {
    super(props);
    this.classes = props.classes;
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
    this.stateCard = React.createRef();
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
    edges.push(this.dEdgeFormat.replace("%node1", startStateName).replace("%node2", entryPointStateName));

    let state = {};
    for (var stateId in states) {
      if (!states.hasOwnProperty(stateId)) {
        continue;
      }
      state = states[stateId];
      this.stateHistoryMap[stateId] = {};
      let nodeStyleFormat = this.dDefaultNodeStyleFormat;
      if (state.Next && state.Type !== "Parallel") {
        edges.push(this.dEdgeFormat.replace("%node1", stateId).replace("%node2", state.Next));
      }
      if (state.Catch && state.Catch.length > 0) {
        nodeStyleFormat = this.dFailedNodeStyleFormat;
        for (let k = 0; k < state.Catch.length; k++) {
          let curCatch = state.Catch[k];
          if (!curCatch.Next) {
            continue;
          }
          edges.push(this.dDottedEdgeFormat.replace("%node1", stateId).replace("%node2", curCatch.Next));
        }
      }

      if (state.Type === "Succeed" || state.End) {
        edges.push(this.dEdgeFormat.replace("%node1", stateId).replace("%node2", endStateName));
      } else if (state.Type === "Fail") {
        nodeStyleFormat = this.dFailedNodeStyleFormat;
        edges.push(this.dDottedEdgeFormat.replace("%node1", stateId).replace("%node2", endStateName));
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
      return <div className={this.classes.progressContainer}><CircularProgress className={this.classes.progress} /></div>;
    }

    let comment = null;
    if (stateMachineDefinition.Comment) {
      comment = <Typography variant="h6" align="center" gutterBottom> {stateMachineDefinition.Comment}</Typography>;
    }

    if (stateMachineDefinition.States.length === 0) {
      return (<div>{comment}</div>);
    }

    let dGraph = this.dGraphFormat.replace("%defaultStyles", this.dDefaultStylesFormat);
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
        nodeStyles.push(this.dFilledNodeStyleFormat.replace("%node", historyEvent.stateEnteredEventDetails.name)
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
        nodeStyles.push(this.dFilledNodeStyleFormat.replace("%node", lastExitedStateName).replace("%color", "red"));
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
          <Card>
            <CardContent>
              <div onClick={this.handleClick}>{comment}<Graphviz dot={dGraph} options={{fit:true, width:"600", height:"700"}} /></div>
            </CardContent>
          </Card>
        </Grid>
        <StateCard ref={this.stateCard} classes={this.classes} currentStateObj={currentStateObj}/>
      </Grid>
    );
  }
}

Graph.propTypes = {
  classes: PropTypes.object.isRequired,
  stateMachineArn: PropTypes.string.isRequired,
};

export default Graph;