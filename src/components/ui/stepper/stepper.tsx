require('./stepper.scss');
import * as React from 'react'
import { cssNames } from "../../../utils";
import omit = require("lodash/omit");

interface Props extends React.HTMLProps<any> {
  step: number
  steps: Step[]
}

interface Step {
  title?: string
}

export class Stepper extends React.Component<Props, {}> {
  render() {
    var activeStep = this.props.step;
    var steps = this.props.steps;
    var props = omit(this.props, ['step', 'steps']);
    return (
        <div {...props} className={cssNames('Stepper flex auto', this.props.className)}>
          {steps.map((step, i) => {
            var stepNumber = i + 1;
            var last = i === steps.length - 1;
            var stepClassName = {
              done: i < activeStep,
              active: i === activeStep
            };
            return (
                <div className={cssNames("box step", stepClassName)} key={stepNumber}>
                  {!last ? <span className="line"/> : null}
                  <div className="point">{stepNumber}</div>
                  <span className="step-title">{step.title}</span>
                </div>
            );
          })}
        </div>
    );
  }
}

export default Stepper;