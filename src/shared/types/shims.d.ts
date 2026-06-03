declare module '@react-native-picker/picker' {
    import * as React from 'react';
    import { ViewStyle, TextStyle } from 'react-native';

    export interface PickerProps {
        selectedValue?: any;
        onValueChange?: (itemValue: any, itemIndex: number) => void;
        style?: ViewStyle;
        itemStyle?: TextStyle;
        children?: React.ReactNode;
    }

    export class Picker extends React.Component<PickerProps> {
        static Item: React.ComponentType<{
            label: string;
            value: any;
            color?: string;
        }>;
    }
}
