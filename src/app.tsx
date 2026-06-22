import { Text } from 'ink';

interface AppProps {
  name?: string;
}

export default function App({ name = 'Stranger' }: AppProps) {
  return (
    <Text>
      Hello, <Text color="green">{name}</Text>
    </Text>
  );
}
