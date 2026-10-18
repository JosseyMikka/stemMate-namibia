import {Component,type ReactNode} from 'react';

// Keep an unavailable optional display from unmounting the learner's chat/draft.
export default class DisplayBoundary extends Component<{children:ReactNode;fallback:ReactNode},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?this.props.fallback:this.props.children;}
}
