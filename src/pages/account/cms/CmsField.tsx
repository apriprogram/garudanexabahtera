// Pilih komponen field sesuai tipe (SPEC §7: text, textarea, image, url, email, phone, color).
import { ColorField } from './ColorField';
import { FieldControl, type FieldControlProps } from './FieldControl';
import { ImageField } from './ImageField';

export function CmsField(props: FieldControlProps) {
  switch (props.field.type) {
    case 'image':
      return <ImageField {...props} />;
    case 'color':
      return <ColorField {...props} />;
    default:
      return <FieldControl {...props} />;
  }
}
