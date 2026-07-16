interface EmptyStateProps {
  title: string
  description?: string
}

export const EmptyState = ({ title, description }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center">
    <p className="text-sm font-medium text-fg-2">{title}</p>
    {description && (
      <p className="text-xs text-fg-3 mt-1.5 leading-relaxed max-w-[28ch] mx-auto">{description}</p>
    )}
  </div>
)
