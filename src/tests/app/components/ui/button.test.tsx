import { ClipboardList } from 'lucide-react-native';
import ReactTestRenderer, { act } from 'react-test-renderer';

import { Button } from 'app/components/ui/button';
import { Icon } from 'app/components/ui/icon';
import { Text } from 'app/components/ui/text';

test('sizes the icon by prop, so no size class reaches the shapes inside the svg', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = ReactTestRenderer.create(
      <Button icon={ClipboardList} onPress={() => {}}>
        <Text>Abrir procedimento</Text>
      </Button>,
    );
  });

  const icon = renderer.root.findByType(Icon);
  expect(icon.props.size).toBe(16);
  expect(icon.props.className ?? '').not.toMatch(/\bsize-/);
});
