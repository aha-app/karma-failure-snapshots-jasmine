/* global jasmine, afterEach */

(function () {
  'use strict'

  var jasmineEnv = jasmine.getEnv()
  var failureSnapshots = window.__failure_snapshots__
  var config = window.__karma__.config.failureSnapshots || {}
  var includePassed = config.includePassed
  var hideFunctionsFrom = config.hideFunctionsFrom || ['jasmine.js']
  var earlySnapshot
  var currentSpec

  window.ensureFailureSnapshot = function () {
    var result = currentSpec.result
    var failed = result.failedExpectations.find(function (failure) {
      return failure.passed === false
    })
    if (failed || includePassed) {
      return failureSnapshots
        .takeFailureSnapshot()
        .then(function (output) {
          earlySnapshot = output
        })
        .catch(function (error) {
          console.log('Taking the failure snapshot failed:')
          console.log(' ', result.fullName)
          console.error(error)
        })
    }
    return Promise.resolve()
  }

  function getSuiteOrSpec (id, children) {
    children || (children = jasmineEnv.topSuite().children)
    for (var i = 0, length = children.length; i < length; ++i) {
      var child = children[i]
      if (child.id === id) {
        return child
      }
      var grandchildren = child.children
      if (grandchildren) {
        child = getSuiteOrSpec(id, grandchildren)
        if (child) {
          return child
        }
      }
    }
  }

  var specFollower = {
    specStarted: function (data) {
      currentSpec = getSuiteOrSpec(data.id)
      earlySnapshot = undefined
    }
  }

  jasmineEnv.addReporter(specFollower)

  function processFailure (done) {
    var result = currentSpec.result
    var firstFailure = result.failedExpectations.find(function (failure) {
      return failure.passed === false
    })
    if (!firstFailure && includePassed) {
      firstFailure = result.passedExpectations[0]
    }
    if (firstFailure) {
      var failure = firstFailure.passed === false
      var message = firstFailure.message || 'Unknown.'
      var stack = firstFailure.stack || ''
      if (stack.indexOf(message) < 0) {
        stack = stack ? message + '\n' + stack : message
      }
      failureSnapshots.collectFailureSnapshot({
        description: result.fullName,
        stack: stack,
        failure: failure,
        pass: !failure,
        earlySnapshot: earlySnapshot,
        hideFunctionsFrom: hideFunctionsFrom
      }, done)
    } else {
      done()
    }
  }

  afterEach(processFailure)
})()
