import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Text } from '@sitecore-content-sdk/nextjs';
import { ButtonBase as Button } from '@/components/button-component/ButtonComponent';
import { FooterNavigationCalloutProps } from './footer-navigation-callout.props';

export const Default: React.FC<FooterNavigationCalloutProps> = ({ fields }) => {
  const { title, description, linkOptional } = fields || {};

  return (
    <aside>
      <Card className="bg-accent text-accent-foreground rounded-none border-none p-2 shadow-none">
        <CardHeader className="flex flex-row justify-between pb-4">
          <CardTitle className="font-heading text-2xl font-light leading-8">
            <Text tag="span" field={title} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Text field={description} className="font-body text-base leading-6" />
          {linkOptional && (
            <Button
              className="mt-10 flex w-full text-center"
              buttonLink={linkOptional}
              contextTitle={title?.value}
            />
          )}
        </CardContent>
      </Card>
    </aside>
  );
};
