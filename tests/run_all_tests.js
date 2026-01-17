/**
 * Master Test Runner for ShopSmart Pro
 * Executes all test suites and generates summary reports
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class TestRunner {
  constructor() {
    this.testFiles = [
      './smoke_test.js',
      './test_unit.js',
      './test_api.js',
      './test_integration.js',
      './test_ui.js',
      './test_security.js',
      './test_database.js'
    ];
    
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      testSuites: [],
      startTime: null,
      endTime: null
    };
  }

  async run() {
    console.log('🚀 Starting ShopSmart Pro Test Suite Execution\n');
    console.log('===============================================');
    
    this.results.startTime = new Date();
    
    for (const testFile of this.testFiles) {
      await this.runTestFile(testFile);
    }
    
    this.results.endTime = new Date();
    this.generateSummaryReport();
  }

  async runTestFile(testFile) {
    return new Promise((resolve) => {
      console.log(`\n🧪 Running ${testFile}...`);
      
      const testFilePath = path.join(__dirname, testFile);
      
      if (!fs.existsSync(testFilePath)) {
        console.log(`❌ Test file does not exist: ${testFile}`);
        this.results.testSuites.push({
          file: testFile,
          status: 'FAILED',
          message: 'File not found',
          tests: 0,
          passed: 0,
          failed: 0,
          skipped: 0
        });
        resolve();
        return;
      }

      // Run the test file using Jest
      const child = spawn('npx', ['jest', testFilePath, '--verbose', '--json'], {
        cwd: path.join(__dirname, '..'),
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, NODE_ENV: 'test' }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        console.log(`✅ Completed ${testFile} (exit code: ${code})`);
        
        try {
          // Parse Jest JSON output
          const outputLines = stdout.trim().split('\n');
          let jsonOutput = '';
          
          // Find the JSON result (usually comes at the end)
          for (let i = outputLines.length - 1; i >= 0; i--) {
            const line = outputLines[i].trim();
            if (line.startsWith('{') && line.endsWith('}')) {
              jsonOutput = line;
              break;
            }
          }

          if (jsonOutput) {
            const jestResult = JSON.parse(jsonOutput);
            const summary = this.parseJestResult(jestResult, testFile);
            this.results.testSuites.push(summary);
            
            // Update overall counts
            this.results.totalTests += summary.tests;
            this.results.passedTests += summary.passed;
            this.results.failedTests += summary.failed;
            this.results.skippedTests += summary.skipped;
          } else {
            // If no JSON output, create a basic result
            const summary = {
              file: testFile,
              status: code === 0 ? 'PASSED' : 'FAILED',
              message: code === 0 ? 'Executed successfully' : 'Execution failed',
              tests: 0,
              passed: 0,
              failed: 0,
              skipped: 0
            };
            this.results.testSuites.push(summary);
          }
        } catch (parseError) {
          console.log(`⚠️ Could not parse results for ${testFile}: ${parseError.message}`);
          const summary = {
            file: testFile,
            status: 'PARSING_ERROR',
            message: `Could not parse Jest output: ${parseError.message}`,
            tests: 0,
            passed: 0,
            failed: 0,
            skipped: 0
          };
          this.results.testSuites.push(summary);
        }
        
        resolve();
      });
    });
  }

  parseJestResult(result, testFile) {
    const numTotalTests = result.numTotalTests || 0;
    const numPassedTests = result.numPassedTests || 0;
    const numFailedTests = result.numFailedTests || 0;
    const numPendingTests = result.numPendingTests || 0;

    const hasFailures = numFailedTests > 0 || result.testResults.some(suite => suite.status === 'failed');

    return {
      file: testFile,
      status: hasFailures ? 'FAILED' : 'PASSED',
      message: hasFailures ? `${numFailedTests} test(s) failed` : 'All tests passed',
      tests: numTotalTests,
      passed: numPassedTests,
      failed: numFailedTests,
      skipped: numPendingTests,
      failureDetails: hasFailures ? this.extractFailureDetails(result) : []
    };
  }

  extractFailureDetails(result) {
    const failures = [];
    
    result.testResults.forEach(suite => {
      if (suite.testResults) {
        suite.testResults.forEach(test => {
          if (test.status === 'failed') {
            failures.push({
              test: test.title,
              suite: suite.name,
              error: test.failureMessages && test.failureMessages.length > 0 
                ? test.failureMessages[0] 
                : 'Unknown error'
            });
          }
        });
      }
    });
    
    return failures;
  }

  generateSummaryReport() {
    const duration = this.results.endTime - this.results.startTime;
    const passRate = this.results.totalTests > 0 
      ? ((this.results.passedTests / this.results.totalTests) * 100).toFixed(2) 
      : 0;

    console.log('\n===============================================');
    console.log('📊 TEST EXECUTION SUMMARY');
    console.log('===============================================');
    console.log(`Start Time: ${this.results.startTime.toLocaleString()}`);
    console.log(`End Time: ${this.results.endTime.toLocaleString()}`);
    console.log(`Duration: ${Math.floor(duration / 1000)} seconds`);
    console.log('');

    console.log('📈 TEST SUITE RESULTS:');
    this.results.testSuites.forEach(suite => {
      const statusEmoji = suite.status === 'PASSED' ? '✅' : suite.status === 'FAILED' ? '❌' : '⚠️';
      console.log(`${statusEmoji} ${suite.file}: ${suite.passed}/${suite.tests} passed`);
      
      if (suite.failed > 0 && suite.failureDetails && suite.failureDetails.length > 0) {
        suite.failureDetails.slice(0, 3).forEach(failure => {
          console.log(`   - FAILED: ${failure.test}`);
        });
        if (suite.failureDetails.length > 3) {
          console.log(`   ... and ${suite.failureDetails.length - 3} more failures`);
        }
      }
    });

    console.log('');
    console.log('📊 OVERALL STATISTICS:');
    console.log(`Total Tests: ${this.results.totalTests}`);
    console.log(`Passed: ${this.results.passedTests}`);
    console.log(`Failed: ${this.results.failedTests}`);
    console.log(`Skipped: ${this.results.skippedTests}`);
    console.log(`Pass Rate: ${passRate}%`);

    // Determine overall status
    const overallStatus = this.results.failedTests === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED';
    console.log(`\n🏁 ${overallStatus}`);

    // Write detailed report to file
    this.writeDetailedReport();

    // Exit with appropriate code
    process.exit(this.results.failedTests > 0 ? 1 : 0);
  }

  writeDetailedReport() {
    const report = {
      summary: {
        totalTests: this.results.totalTests,
        passedTests: this.results.passedTests,
        failedTests: this.results.failedTests,
        skippedTests: this.results.skippedTests,
        passRate: this.results.totalTests > 0 
          ? parseFloat(((this.results.passedTests / this.results.totalTests) * 100).toFixed(2)) 
          : 0,
        startTime: this.results.startTime.toISOString(),
        endTime: this.results.endTime.toISOString(),
        durationMs: this.results.endTime - this.results.startTime
      },
      testSuites: this.results.testSuites,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        timestamp: new Date().toISOString()
      }
    };

    const reportPath = path.join(__dirname, 'test_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📋 Detailed report saved to: ${reportPath}`);
  }
}

// Run the tests when this script is executed directly
if (require.main === module) {
  const runner = new TestRunner();
  
  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n\n⚠️  Test execution interrupted by user');
    process.exit(130);
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('\n💥 Uncaught exception during test execution:', error);
    process.exit(1);
  });
  
  runner.run().catch(error => {
    console.error('\n💥 Error running tests:', error);
    process.exit(1);
  });
}

module.exports = TestRunner;