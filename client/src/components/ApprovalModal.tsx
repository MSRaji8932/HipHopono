interface ApprovalRequest {
  id: string;
  kind: string;
  detail: string;
}

interface ApprovalModalProps {
  request: ApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
}

export default function ApprovalModal({ request, onApprove, onReject }: ApprovalModalProps) {
  let detailObj: Record<string, unknown> = {};
  try {
    detailObj = JSON.parse(request.detail);
  } catch {
    detailObj = { raw: request.detail };
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-secondary border border-border rounded-lg w-full max-w-md mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-medium text-text-bright">Approval Required</h3>
          <p className="text-sm text-text-muted mt-1">
            The AI wants to execute: <span className="text-accent font-mono">{request.kind}</span>
          </p>
        </div>

        <div className="px-6 py-4 max-h-64 overflow-y-auto">
          <pre className="text-xs text-text font-mono bg-bg rounded p-3 whitespace-pre-wrap">
            {JSON.stringify(detailObj, null, 2)}
          </pre>
        </div>

        <div className="px-6 py-4 border-t border-border flex gap-3 justify-end">
          <button
            onClick={onReject}
            className="px-4 py-2 bg-bg-tertiary hover:bg-border text-text rounded transition-colors text-sm"
          >
            Reject
          </button>
          <button
            onClick={onApprove}
            className="px-4 py-2 bg-success hover:bg-success/80 text-bg font-medium rounded transition-colors text-sm"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
