interface StatusPageHeaderProps {
  title: string
  description?: string | null
}

export function StatusPageHeader({ title, description }: StatusPageHeaderProps) {
  return (
    <div className="text-center space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description && (
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          {description}
        </p>
      )}
    </div>
  )
}
