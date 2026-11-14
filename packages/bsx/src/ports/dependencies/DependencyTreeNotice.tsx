/**
 * What the dependency rows cannot say themselves: that the dry run could not
 * be asked, or that it refuses without naming a dependency. An unmet
 * dependency is said at its own row (`DependenciesContainer`), once.
 */
export const DependencyTreeNotice = ({
  tree,
}: {
  tree: {
    satisfied?: boolean;
    unmet: { path: string[]; reason: string }[];
    error?: Error | null;
  };
}) => {
  if (tree.error) {
    return (
      <p className="text-xs text-muted-foreground">
        Which agents this reaches could not be previewed; starting it will tell.
      </p>
    );
  }
  if (tree.satisfied !== false || tree.unmet.length > 0) return null;
  return <p className="text-xs text-destructive">A dependency is not met yet.</p>;
};
