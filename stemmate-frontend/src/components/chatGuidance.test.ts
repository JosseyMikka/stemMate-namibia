import assert from 'node:assert/strict';
import {needsClarification,nextPrompt,replyLabel,withClarification,quizRequest} from './chatGuidance';
assert.equal(needsClarification('I don’t understand equations'),true);
assert.equal(needsClarification('I am stuck'),true);
assert.equal(needsClarification('Please help solve 2x+3=9'),false);
assert.equal(needsClarification('What is photosynthesis?'),false);
assert.equal(needsClarification(''),false);
assert.equal(withClarification(' I need help ',' choosing an operation '),'I need help\nWhat I need help with: choosing an operation');
assert.ok(withClarification('x'.repeat(1900),'y'.repeat(1000)).length<=2000);
assert.match(nextPrompt('independent'),/hidden/);
assert.match(nextPrompt('explain'),/choose/);
assert.equal(replyLabel(undefined,true),'What feels tricky?');
assert.equal(replyLabel('feedback'),'Your reflection (optional)');
console.log('Optional question clarification, prompt bounds and reasoning-stage guidance passed.');

assert.equal(quizRequest('Quiz me on photosynthesis'),'photosynthesis');
assert.equal(quizRequest('please give me a quiz about cells.'),'cells');
assert.equal(quizRequest('Quiz me'),'');
assert.equal(quizRequest('What is a quiz?'),null);
assert.equal(quizRequest('Quiz me on linear equations?'),'linear equations');

assert.equal(quizRequest('Can you please quiz me on cells?'),'cells');
assert.equal(quizRequest('I would like a quiz about acids'),'acids');
