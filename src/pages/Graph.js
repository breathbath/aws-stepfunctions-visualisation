import React from 'react';
import PropTypes from 'prop-types';
import { Graphviz } from 'graphviz-react';
import Typography from '@material-ui/core/Typography';
import CustomError from './CustomError';
import CircularProgress from '@material-ui/core/CircularProgress';
import Grid from '@material-ui/core/Grid';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import { CardContent } from '@material-ui/core';
import { fetchAwsWithErrorHandling } from '../components/AwsFetcher';

class Graph extends React.Component {
  constructor(props) {
    super(props);
    this.classes = props.classes;
    this.stateMachineArn = props.stateMachineArn;
    this.executionArn = props.executionArn;
    this.selectedStateId = props.stateId;
    this.state = {
      error: null,
      isLoaded: false,
      stateMachineDefinition: {
        'Comment': '',
        'StartAt': '',
        'States': []
      },
      historyEvents: []
    };
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

    let dGraphFormat = 'digraph  { %defaultStyles %nodeStyles %edges}';
    let dDefaultStylesFormat = 'node [shape="box"]';
    let dDefaultNodeStyleFormat = '%node [shape="box", URL="%url"]';
    let dFilledNodeStyleFormat = '%node [fillcolor="%color", shape="box", URL="%url", style="filled"]';
    let dEdgeFormat = '%node1 -> %node2';
    let dDottedEdgeFormat = '%node1 -> %node2[style=dashed, color=red]';

    let dGraph = dGraphFormat.replace("%defaultStyles", dDefaultStylesFormat);
    let nodeStyles = [];
    let edges = [];

    let stateHistoryMap = {};
    let state = "";
    for (var stateId in stateMachineDefinition.States) {
      if (!stateMachineDefinition.States.hasOwnProperty(stateId)) {
        continue;
      }
      state = stateMachineDefinition.States[stateId];
      stateHistoryMap[stateId] = {};

      nodeStyles.push(
        dDefaultNodeStyleFormat.replace("%node", stateId).replace("%url", "/sm/" + this.stateMachineArn + "/e/" + this.executionArn + "/state/" + stateId)
      );
      if (state.Next) {
        edges.push(dEdgeFormat.replace("%node1", stateId).replace("%node2", state.Next));
      }
      if (state.Catch && state.Catch.length > 0) {
        for (let k = 0; k < state.Catch.length; k++) {
          let curCatch = state.Catch[k];
          if (!curCatch.Next) {
            continue;
          }
          edges.push(dDottedEdgeFormat.replace("%node1", stateId).replace("%node2", curCatch.Next));
        }
      }
    }

    let lastExitedStateName = '';
    for (let k = 0; k < historyEvents.length; k++) {
      let historyEvent = historyEvents[k];
      if (historyEvent.type.endsWith("StateEntered") && historyEvent.stateEnteredEventDetails.name && stateHistoryMap[historyEvent.stateEnteredEventDetails.name]) {
        let stateUrl = "/sm/" + this.stateMachineArn + "/e/" + this.executionArn + "/state/" + historyEvent.stateEnteredEventDetails.name;
        nodeStyles.push(dFilledNodeStyleFormat.replace("%node", historyEvent.stateEnteredEventDetails.name).replace("%color", "green").replace("%url", stateUrl));
        stateHistoryMap[historyEvent.stateEnteredEventDetails.name]['input'] = historyEvent;
      }

      if (historyEvent.type.endsWith("StateExited") && historyEvent.stateExitedEventDetails.name && stateHistoryMap[historyEvent.stateExitedEventDetails.name]) {
        lastExitedStateName = historyEvent.stateExitedEventDetails.name;
        stateHistoryMap[historyEvent.stateExitedEventDetails.name]['output'] = historyEvent;
      }

      if (historyEvent.type === "ExecutionFailed" && lastExitedStateName) {
        nodeStyles.push(dFilledNodeStyleFormat.replace("%node", lastExitedStateName).replace("%color", "red"));
        lastExitedStateName = "";
        continue;
      }
    }

    let currentStateObj = stateHistoryMap[this.selectedStateId];

    dGraph = dGraph.replace("%nodeStyles", nodeStyles.join(' '));
    dGraph = dGraph.replace("%edges", edges.join(' '));

    let renderedStateCard = (
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Please select a step on the graph to see it's i/o
        </Typography>
      </CardContent>
    );

    if (currentStateObj && currentStateObj.input) {
      renderedStateCard = (
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Selected state: {currentStateObj.input.stateEnteredEventDetails.name}
          </Typography>
          <Grid container spacing={16}>
            <Grid item xs>
              {this.renderIoCard(currentStateObj, 'input')}
            </Grid>
          </Grid>
          <Grid container spacing={16}>
            <Grid item xs>
              {this.renderIoCard(currentStateObj, 'output')}
            </Grid>
          </Grid>
        </CardContent>
      );
    }
    return (
      <Grid container spacing={16}>
        <Grid item xs>
          <Card>
            <CardContent>
              <div>{comment}<Graphviz dot={dGraph} /></div>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs>
          <Card>
            {renderedStateCard}
          </Card>
        </Grid>
      </Grid>
    );
  }

  renderIoCard(currentStateObj, cardTitle) {
    let stateDetailsPath = 'stateEnteredEventDetails';
    if (cardTitle === 'output') {
      console.log(currentStateObj);
      stateDetailsPath = 'stateExitedEventDetails';
    }

    if (!currentStateObj || !currentStateObj[cardTitle] || !currentStateObj[cardTitle][stateDetailsPath]) {
      return null;
    }
    let stateDetails = currentStateObj[cardTitle][stateDetailsPath];
    return (
      <Card className={this.classes.card}>
        <CardHeader title={cardTitle} />
        <CardContent>
          <Typography component="p">
            {stateDetails[cardTitle]}
          </Typography>
        </CardContent>
      </Card>
    );
  }
}

Graph.propTypes = {
  classes: PropTypes.object.isRequired,
  stateMachineArn: PropTypes.string.isRequired,
};

export default Graph;