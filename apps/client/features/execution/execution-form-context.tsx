import React, { createContext, useContext } from 'react';

interface ExecutionFormContextValue {
  formData: Record<string, any>;
  computedValues: Record<string, any> | null;
  onFieldChange: (activityCode: string, value: number) => void;
  onCommentChange: (activityCode: string, comment: string) => void;
  validationErrors: Record<string, any>;
  isCalculating: boolean;
  isValidating: boolean;
  isBalanced: boolean;
  difference: number;
  table: Array<Record<string, any>>; // hierarchical rows built from activities
  // helpers
  isQuarterEditable: (q: "Q1" | "Q2" | "Q3" | "Q4") => boolean;
  isQuarterVisible: (q: "Q1" | "Q2" | "Q3" | "Q4") => boolean;
  getSectionTotals: (sectionId: string) => { q1: number; q2: number; q3: number; q4: number; cumulativeBalance: number };
  getRowState: (code: string) => { isEditable: boolean; isCalculated: boolean; validationMessage?: string };
  isRowLocked: (code: string, q: "Q1" | "Q2" | "Q3" | "Q4") => boolean;
  expandState: Record<string, boolean>;
  onToggleSection: (id: string) => void;
}

const ExecutionFormContext = createContext<ExecutionFormContextValue | null>(null);

export const ExecutionFormProvider: React.FC<{
  value: ExecutionFormContextValue;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <ExecutionFormContext.Provider value={value}>
      {children}
    </ExecutionFormContext.Provider>
  );
};

export const useExecutionFormContext = () => {
  const context = useContext(ExecutionFormContext);
  if (!context) {
    throw new Error('useExecutionFormContext must be used within ExecutionFormProvider');
  }
  return context;
};

// Debug component to help troubleshoot
export const ExecutionFormDebugPanel: React.FC = () => {
  const ctx = useExecutionFormContext();
  const sampleForm = Object.values(ctx.formData)[0] || {};
  const sampleComputed = ctx.computedValues || {};

  return (
    <div className="bg-gray-100 p-4 rounded-lg text-xs font-mono">
      <h4 className="font-bold mb-2">Execution Debug Info:</h4>
      <div className="space-y-2">
        <div>
          <strong>Form Data Keys:</strong> {Object.keys(ctx.formData).join(', ')}
        </div>
        <div>
          <strong>Is Balanced:</strong> {String(ctx.isBalanced)} | <strong>Δ(F-G):</strong> {ctx.difference}
        </div>
        <div>
          <strong>Sample Activity (form):</strong>
          <pre className="mt-1 text-xs">{JSON.stringify(sampleForm, null, 2)}</pre>
        </div>
        <div>
          <strong>Computed Values (server):</strong>
          <pre className="mt-1 text-xs">{JSON.stringify(sampleComputed, null, 2)}</pre>
        </div>
        <div>
          <strong>Validation Errors:</strong>
          <pre className="mt-1 text-xs">{JSON.stringify(ctx.validationErrors, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
};


