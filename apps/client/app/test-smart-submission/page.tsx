import { TestSmartExecutionSubmission } from "@/components/test-smart-execution-submission";

export default function TestSmartSubmissionPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Smart Execution Submission Test</h1>
          <p className="text-muted-foreground mt-2">
            Test the create vs update logic for execution submissions
          </p>
        </div>
        <TestSmartExecutionSubmission />
      </div>
    </div>
  );
}
