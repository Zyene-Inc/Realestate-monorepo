const PROPERTY_LINK_PATTERN =
  /(https:\/\/coachjohnsonrealty\.com\/(?:properties|rentals)\/[^\s)]+)/g;

function isPropertyLink(part: string) {
  return /^https:\/\/coachjohnsonrealty\.com\/(?:properties|rentals)\//.test(
    part,
  );
}

export function PublicChatbotMessageContent({
  content,
}: {
  content: string;
}) {
  return (
    <p className="whitespace-pre-wrap text-sm leading-6">
      {content.split(PROPERTY_LINK_PATTERN).map((part, index) =>
        isPropertyLink(part) ? (
          <a
            className="font-semibold text-primary underline underline-offset-4"
            href={part}
            key={`${part}-${index}`}
          >
            View property
          </a>
        ) : (
          part
        ),
      )}
    </p>
  );
}
